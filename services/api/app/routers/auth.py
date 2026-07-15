# This module re-exports everything from app.auth.security.
# All routes and auth dependencies live there.
from app.auth.security import (
    router,
    get_current_user,
    require_admin,
    require_super_admin,
    create_access_token,
)

# Alias kept for any legacy internal references
get_current_user_real = get_current_user
