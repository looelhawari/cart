<?php

return [
    // Registration
    'registration_successful' => 'تم إنشاء الحساب بنجاح.',
    'registration_pending_verification' => 'أرسلنا رمز التحقق إلى بريدك الإلكتروني. أدخل الرمز لإكمال إنشاء الحساب.',
    'registration_otp_send_failed' => 'تعذر إرسال بريد التحقق. يرجى المحاولة مرة أخرى بعد قليل.',
    'signup_failed_try_later' => 'حدث خطأ ما. يرجى المحاولة لاحقاً.',

    // OTP / Verification
    'invalid_or_expired_otp' => 'رمز التحقق غير صالح أو منتهي الصلاحية.',
    'user_not_found' => 'المستخدم غير موجود.',
    'email_verified_successfully' => 'تم التحقق من البريد الإلكتروني بنجاح.',
    'otp_verified_successfully' => 'تم التحقق من الرمز بنجاح.',
    'email_already_verified' => 'البريد الإلكتروني محقق بالفعل.',
    'otp_resent' => 'تم إعادة إرسال رمز التحقق إلى بريدك الإلكتروني.',
    'otp_rate_limited' => 'يرجى الانتظار :seconds ثانية قبل طلب رمز تحقق جديد.',

    // Login
    'invalid_credentials' => 'بيانات الدخول غير صحيحة.',
    'account_deactivated' => 'تم تعطيل حسابك.',
    'verify_email_otp_sent' => 'يرجى التحقق من بريدك الإلكتروني. تم إرسال رمز تحقق جديد.',
    'login_successful' => 'تم تسجيل الدخول بنجاح.',
    'logged_out_successfully' => 'تم تسجيل الخروج بنجاح.',

    // Token
    'invalid_token_format' => 'صيغة الرمز غير صالحة.',
    'invalid_or_expired_refresh_token' => 'رمز التحديث غير صالح أو منتهي الصلاحية.',
    'token_refreshed_successfully' => 'تم تحديث الرمز بنجاح.',

    // Forgot / Reset Password
    'email_not_verified_reset' => 'هذا البريد الإلكتروني غير محقق. يرجى التسجيل والتحقق من بريدك الإلكتروني أولاً.',
    'password_reset_otp_sent' => 'تم إرسال رمز إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.',
    'password_reset_successfully' => 'تم إعادة تعيين كلمة المرور بنجاح.',

    // OTP email delivery
    'otp_email_failed' => 'فشل إرسال بريد التحقق. يرجى المحاولة لاحقاً.',
    'otp_email_failed_resend' => 'فشل إعادة إرسال بريد التحقق. يرجى المحاولة لاحقاً.',

    // Profile
    'profile_updated_successfully' => 'تم تحديث الملف الشخصي بنجاح',
    'email_change_not_allowed' => 'لا يمكن تغيير البريد الإلكتروني من تحديث الملف الشخصي. استخدم خطوات تغيير البريد المخصصة.',
    'avatar_uploaded_successfully' => 'تم رفع الصورة الشخصية بنجاح',
    'failed_upload_avatar' => 'فشل رفع الصورة الشخصية',
    'avatar_deleted_successfully' => 'تم حذف الصورة الشخصية بنجاح',
    'password_changed_successfully' => 'تم تغيير كلمة المرور بنجاح',

    // Validation
    'validation_failed' => 'فشل التحقق',
    'incorrect_password' => 'كلمة المرور غير صحيحة',
    'password_confirmed_successfully' => 'تم تأكيد كلمة المرور بنجاح',
    'full_name_required' => 'يرجى إدخال الاسم الكامل.',
    'full_name_too_short' => 'يجب أن يكون الاسم الكامل حرفين على الأقل.',
    'full_name_too_long' => 'يجب ألا يتجاوز الاسم الكامل 120 حرفاً.',
    'phone_required' => 'يرجى إدخال رقم الهاتف.',
    'invalid_egyptian_mobile' => 'يرجى إدخال رقم موبايل مصري صحيح.',
    'date_of_birth_required' => 'يرجى اختيار تاريخ الميلاد.',
    'date_of_birth_invalid' => 'يرجى إدخال تاريخ ميلاد صحيح.',
    'date_of_birth_must_be_past' => 'يجب أن يكون تاريخ الميلاد في الماضي.',
    'gender_required' => 'يرجى اختيار النوع.',
    'gender_invalid' => 'يرجى اختيار نوع صحيح.',
    'password_confirmation_mismatch' => 'كلمة المرور وتأكيدها غير متطابقين.',
    'address_label_required' => 'يرجى اختيار نوع العنوان.',
    'address_label_invalid' => 'نوع العنوان يجب أن يكون المنزل أو العمل أو آخر.',
    'address_street_required' => 'عنوان الشارع مطلوب.',
    'address_city_required' => 'المدينة مطلوبة.',

    // Check availability
    'email_already_exists' => 'البريد الإلكتروني مستخدم بالفعل',
    'email_available' => 'البريد الإلكتروني متاح',
    'phone_already_exists' => 'رقم الهاتف مستخدم بالفعل',
    'phone_already_registered_login' => 'رقم الهاتف هذا مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.',
    'account_cannot_be_used_contact_support' => 'لا يمكن استخدام هذا الحساب. يرجى التواصل مع الدعم.',
    'phone_available' => 'رقم الهاتف متاح',

    // Email change
    'social_only_email_locked' => 'لا يمكن لحسابات التسجيل الاجتماعي تغيير البريد الإلكتروني.',
    'email_change_rate_limited' => 'طلبات تغيير بريد إلكتروني كثيرة. يرجى المحاولة لاحقاً.',
    'verification_code_sent_new_email' => 'تم إرسال رمز التحقق إلى بريدك الإلكتروني الجديد.',
    'invalid_or_expired_verification_code' => 'رمز التحقق غير صالح أو منتهي الصلاحية.',
    'email_already_in_use' => 'هذا البريد الإلكتروني مستخدم بالفعل.',
    'email_changed_successfully' => 'تم تغيير البريد الإلكتروني بنجاح.',
    'incorrect_password_try_again' => 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.',

    // Account deletion
    'password_required_delete' => 'كلمة المرور مطلوبة لحذف حسابك.',
    'active_orders_exist' => 'لديك طلبات نشطة. يرجى الانتظار حتى اكتمال جميع الطلبات أو إلغائها قبل حذف حسابك.',
    'account_deleted_successfully' => 'تم حذف حسابك وجميع بياناتك الشخصية نهائياً.',
    'account_deletion_failed' => 'حدث خطأ أثناء حذف حسابك. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.',
    'no_account_found' => 'لم يتم العثور على حساب بهذا البريد الإلكتروني.',
    'provide_valid_email_password' => 'يرجى تقديم بريد إلكتروني وكلمة مرور صالحين.',
    'active_orders_exist_web' => 'هذا الحساب لديه طلبات نشطة. يرجى الانتظار حتى اكتمال جميع الطلبات أو إلغائها قبل طلب الحذف.',
    'account_deletion_failed_web' => 'حدث خطأ أثناء حذف حسابك. يرجى المحاولة مرة أخرى أو التواصل مع الدعم على Cart.shopegy@gmail.com.',
];
