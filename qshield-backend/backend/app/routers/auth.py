from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel
import pyotp
import io
import base64
import jwt

from backend.app.db import get_db
from backend.app.models import User
from backend.app.schemas import UserCreate, UserOut, Token
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    oauth2_scheme,
    SECRET_KEY,
    ALGORITHM,
)

router = APIRouter()


class TwoFAVerify(BaseModel):
    email: str
    code: str


class RefreshRequest(BaseModel):
    refresh_token: str


def _issue_token_pair(email: str) -> dict:
    """Helper: create both access + refresh tokens for a user."""
    access_token = create_access_token(data={"sub": email})
    refresh_token = create_refresh_token(data={"sub": email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "require_2fa": False,
    }


# ── Register ──────────────────────────────────────────────
@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(email=user.email, hashed_password=get_password_hash(user.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ── Login ─────────────────────────────────────────────────
@router.post("/login")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2FA gating — return challenge instead of tokens
    if user.totp_enabled:
        return {"require_2fa": True, "email": user.email}

    return _issue_token_pair(user.email)


# ── Token Refresh ─────────────────────────────────────────
@router.post("/refresh")
def refresh_access_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    """
    Exchange a valid refresh token (≤4 h old) for a new access token.
    Returns a new access token AND rotates the refresh token.
    """
    try:
        data = decode_refresh_token(payload.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired — please log in again",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    email = data.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Rotate: issue fresh pair
    return _issue_token_pair(user.email)


# ── 2FA verify (login) ────────────────────────────────────
@router.post("/2fa/verify")
def verify_2fa(payload: TwoFAVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA not configured for this user")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Invalid or expired 2FA code")

    return _issue_token_pair(user.email)


# ── 2FA setup ─────────────────────────────────────────────
@router.post("/2fa/setup")
def setup_2fa(payload: TwoFAVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.code:
        # Phase 1: generate secret & QR
        secret = pyotp.random_base32()
        user.totp_secret = secret
        db.commit()
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name="Requiem Security")
        try:
            import qrcode
            qr = qrcode.make(uri)
            buf = io.BytesIO()
            qr.save(buf, format="PNG")
            qr_b64 = base64.b64encode(buf.getvalue()).decode()
            qr_data_url = f"data:image/png;base64,{qr_b64}"
        except ImportError:
            qr_data_url = None
        return {"secret": secret, "uri": uri, "qr": qr_data_url}
    else:
        # Phase 2: verify and enable
        if not user.totp_secret:
            raise HTTPException(status_code=400, detail="Call setup without code first")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(payload.code, valid_window=1):
            raise HTTPException(status_code=401, detail="Invalid code — try again")
        user.totp_enabled = True
        db.commit()
        return {"enabled": True}


# ── get_current_user (used by other routers) ──────────────
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exception
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
