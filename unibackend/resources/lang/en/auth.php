<?php

return [
    // Registration
    'registration_successful' => 'Account created successfully.',
    'registration_pending_verification' => 'We have sent a verification code to your email. Enter it to complete sign-up.',
    'registration_otp_send_failed' => 'We could not send the verification email. Please try again in a moment.',
    'signup_failed_try_later' => 'Something went wrong. Please try again later.',

    // OTP / Verification
    'invalid_or_expired_otp' => 'Invalid or expired OTP.',
    'user_not_found' => 'User not found.',
    'email_verified_successfully' => 'Email verified successfully.',
    'otp_verified_successfully' => 'OTP verified successfully.',
    'email_already_verified' => 'Email is already verified.',
    'otp_resent' => 'OTP has been resent to your email.',
    'otp_rate_limited' => 'Please wait :seconds seconds before requesting another OTP.',

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
    'email_not_verified_reset' => 'This email is not verified. Please sign up and verify your email first.',
    'password_reset_otp_sent' => 'Password reset OTP sent to your email.',
    'password_reset_successfully' => 'Password reset successfully.',

    // OTP email delivery
    'otp_email_failed' => 'Failed to send verification email. Please try again later.',
    'otp_email_failed_resend' => 'Failed to resend verification email. Please try again later.',

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
    'full_name_required' => 'Please enter your full name.',
    'full_name_too_short' => 'Full name must be at least 2 characters.',
    'full_name_too_long' => 'Full name must not exceed 120 characters.',
    'phone_required' => 'Please enter your phone number.',
    'invalid_egyptian_mobile' => 'Please enter a valid Egyptian mobile number.',
    'date_of_birth_required' => 'Please select your date of birth.',
    'date_of_birth_invalid' => 'Please provide a valid date of birth.',
    'date_of_birth_must_be_past' => 'Date of birth must be in the past.',
    'gender_required' => 'Please select your gender.',
    'gender_invalid' => 'Please select a valid gender.',
    'password_confirmation_mismatch' => 'Password and confirmation password do not match.',
    'address_label_required' => 'Please select an address type.',
    'address_label_invalid' => 'Address type must be Home, Work, or Other.',
    'address_street_required' => 'Street address is required.',
    'address_city_required' => 'City is required.',

    // Check availability
    'email_already_exists' => 'Email already exists',
    'email_available' => 'Email is available',
    'phone_already_exists' => 'Phone number already exists',
    'phone_already_registered_login' => 'This phone number is already registered. Please log in instead.',
    'account_cannot_be_used_contact_support' => 'This account cannot be used. Please contact support.',
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
    'account_deletion_failed_web' => 'An error occurred while deleting your account. Please try again or contact support at Cart.shopegy@gmail.com.',
];
