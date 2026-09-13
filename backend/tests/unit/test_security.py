"""
tests/unit/test_security.py
PART 2 — Unit tests for password hashing and JWT token utilities.
These run in-process with no network calls.
"""
import uuid
from datetime import timedelta

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    """Test 8 — Password storage correctness."""

    def test_hash_is_not_plaintext(self):
        hashed = hash_password("mysecretpass")
        assert hashed != "mysecretpass"

    def test_hash_starts_with_bcrypt_prefix(self):
        """bcrypt hashes always start with $2b$ or $2a$."""
        hashed = hash_password("testpass")
        assert hashed.startswith("$2")

    def test_correct_password_verifies(self):
        hashed = hash_password("correct_horse")
        assert verify_password("correct_horse", hashed) is True

    def test_wrong_password_fails(self):
        hashed = hash_password("correct_horse")
        assert verify_password("wrong_horse", hashed) is False

    def test_empty_string_hash_different_each_time(self):
        """bcrypt salts ensure different hashes for same input."""
        h1 = hash_password("same_password")
        h2 = hash_password("same_password")
        assert h1 != h2  # different salts

    def test_both_hashes_still_verify_correctly(self):
        h1 = hash_password("same_password")
        h2 = hash_password("same_password")
        assert verify_password("same_password", h1) is True
        assert verify_password("same_password", h2) is True

    def test_sql_injection_in_password_does_not_crash(self):
        """Password field must be treated as opaque string."""
        evil = "' OR 1=1 --; DROP TABLE users;"
        hashed = hash_password(evil)
        assert verify_password(evil, hashed) is True
        assert verify_password("normal", hashed) is False


class TestJWTTokens:
    """Test 5/6 — JWT creation, validation, tampering, expiry."""

    def _make_token(self, user_id=None, org_id=None, role="admin", expires_delta=None):
        return create_access_token(
            user_id=user_id or str(uuid.uuid4()),
            org_id=org_id or str(uuid.uuid4()),
            role=role,
            email="security-test@example.com",
            expires_delta=expires_delta,
        )

    def test_token_decodes_correctly(self):
        uid = str(uuid.uuid4())
        oid = str(uuid.uuid4())
        token = self._make_token(user_id=uid, org_id=oid, role="admin")
        payload = decode_access_token(token)
        assert payload["sub"] == uid
        assert payload["org_id"] == oid
        assert payload["role"] == "admin"

    def test_token_contains_exp(self):
        token = self._make_token()
        payload = decode_access_token(token)
        assert "exp" in payload
        assert "iat" in payload

    def test_tampered_payload_raises_jwterror(self):
        """Test 5 — Signature verification catches tampering."""
        token = self._make_token()
        parts = token.split(".")
        # Replace payload with a different base64 segment
        import base64
        import json
        fake_payload = base64.urlsafe_b64encode(
            json.dumps({"sub": "hacked", "org_id": str(uuid.uuid4()), "role": "superadmin", "exp": 9999999999}).encode()
        ).rstrip(b"=").decode()
        tampered = f"{parts[0]}.{fake_payload}.{parts[2]}"
        with pytest.raises(JWTError):
            decode_access_token(tampered)

    def test_expired_token_raises_jwterror(self):
        """Test 6 — Expired tokens are rejected."""
        token = self._make_token(expires_delta=timedelta(seconds=-1))
        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_wrong_secret_raises_jwterror(self):
        """Token signed with a different secret must be rejected."""
        from jose import jwt
        token = jwt.encode(
            {"sub": "x", "org_id": "y", "role": "admin", "exp": 9999999999},
            "completely-different-secret",
            algorithm="HS256",
        )
        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_algorithm_confusion_raises_jwterror(self):
        """Ensure alg=none attack fails."""
        from jose import jwt
        try:
            token = jwt.encode(
                {"sub": "x", "org_id": "y", "role": "admin", "exp": 9999999999},
                "",
                algorithm="none",
            )
            with pytest.raises(JWTError):
                decode_access_token(token)
        except Exception:
            pass  # some jose versions refuse to encode with alg=none

    def test_role_preserved_in_token(self):
        for role in ("admin", "staff", "display"):
            token = self._make_token(role=role)
            payload = decode_access_token(token)
            assert payload["role"] == role
