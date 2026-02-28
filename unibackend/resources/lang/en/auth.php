<?php

return [
    // Registration
    'registration_successful' => 'Registration successful. Please verify your email address.',

    // OTP / Verification
    'invalid_or_expired_otp' => 'Invalid or expired OTP.',
    'user_not_found' => 'User not found.',
    'email_verified_successfully' => 'Email verified successfully.',
    'otp_verified_successfully' => 'OTP verified successfully.',
    'email_already_verified' => 'Email is already verified.',
    'otp_resent' => 'OTP has been resent to your email.',

    // Login
    'invalid_credentials' => 'Invalid credentials.',
    'account_deactivated' => 'Your account has been deactivated.',
    'verify_email_otp_sent' => 'Please verify your email address. A new OTP has been sent.',
    'login_successful' => 'Login successful.',
    'logged_out_successfully' => 'Logged out successfully.',

    // Token
    'invalid_token_format' => 'Invalid token format.',
    'invalid_or_expired_refresh_token' => 'Invalid or expired refresh token.',
    'token_refreshed_successfully' => 'Token refreshed successfully.',

    // Forgot / Reset Password
    'email_not_verified_reset' => 'Your email is not verified. Please verify your email first before resetting your password.',
    'password_reset_otp_sent' => 'Password reset OTP sent to your email.',
    'password_reset_successfully' => 'Password reset successfully.',

    // Profile
    'profile_updated_successfully' => 'Profile updated successfully',
    'email_change_not_allowed' => 'Email cannot be changed through profile update. Use the dedicated email change flow.',
    'avatar_uploaded_successfully' => 'Avatar uploaded successfully',
    'failed_upload_avatar' => 'Failed to upload avatar',
    'avatar_deleted_successfully' => 'Avatar deleted successfully',
    'password_changed_successfully' => 'Password changed successfully',

    // Validation
    'validation_failed' => 'Validation failed',
    'incorrect_password' => 'Incorrect password',
    'password_confirmed_successfully' => 'Password confirmed successfully',

    // Check availability
    'email_already_exists' => 'Email already exists',
    'email_available' => 'Email is available',
    'phone_already_exists' => 'Phone number already exists',
    'phone_available' => 'Phone number is available',

    // Email change
    'social_only_email_locked' => 'Social-only accounts cannot change their email address.',
    'email_change_rate_limited' => 'Too many email change requests. Please try again later.',
    'verification_code_sent_new_email' => 'Verification code sent to your new email address.',
    'invalid_or_expired_verification_code' => 'Invalid or expired verification code.',
    'email_already_in_use' => 'This email address is already in use.',
    'email_changed_successfully' => 'Email changed successfully.',
    'incorrect_password_try_again' => 'Incorrect password. Please try again.',

    // Account deletion
    'password_required_delete' => 'Password is required to delete your account.',
    'active_orders_exist' => 'You have active orders. Please wait for all orders to be completed or cancelled before deleting your account.',
    'account_deleted_successfully' => 'Your account and all personal data have been permanently deleted.',
    'account_deletion_failed' => 'An error occurred while deleting your account. Please try again or contact support.',
    'no_account_found' => 'No account found with this email address.',
    'provide_valid_email_password' => 'Please provide a valid email address and password.',
    'active_orders_exist_web' => 'This account has active orders. Please wait for all orders to be completed or cancelled before requesting deletion.',
    'account_deletion_failed_web' => 'An error occurred while deleting your account. Please try again or contact support at support@cartshop.site.',
];
