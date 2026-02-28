<?php

return [
    // Pre-check
    'validation_failed' => 'فشل التحقق',
    'pre_check_successful' => 'فحص الدفع ناجح. تابع إلى ملخص الطلب.',
    'service_unavailable' => 'خدمة الدفع غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى أو اختيار الدفع عند الاستلام.',

    // Initiate
    'unauthorized_order' => 'غير مصرح: الطلب لا ينتمي إليك',
    'already_paid' => 'الطلب مدفوع بالفعل',
    'processing_saved_card' => 'جاري معالجة الدفع بالبطاقة المحفوظة',
    'initiate_failed' => 'فشل في بدء الدفع. يرجى المحاولة مرة أخرى.',

    // Status
    'successful' => 'تمت عملية الدفع بنجاح',
    'failed' => 'فشلت عملية الدفع',
    'not_found_for_order' => 'لا يوجد دفع لهذا الطلب',
    'status_fetch_failed' => 'فشل في الحصول على حالة الدفع',
    'not_found' => 'الدفع غير موجود',
    'status_retrieve_failed' => 'فشل في استرداد حالة الدفع',

    // Saved card
    'unauthorized_access' => 'وصول غير مصرح به للطلب',
    'unauthorized_payment_method' => 'وصول غير مصرح به لطريقة الدفع',
    'method_deleted' => 'تم حذف طريقة الدفع',
    'method_token_invalid' => 'رمز طريقة الدفع غير صالح',
    'card_expired' => 'انتهت صلاحية البطاقة',
    'moto_3ds_redirect' => 'يتطلب MOTO تحقق 3DS - إعادة توجيه للدفع',
    'unauthorized_payment_status' => 'وصول غير مصرح به لحالة الدفع',

    // Payment methods
    'methods_fetch_failed' => 'فشل في استرداد طرق الدفع',
    'method_not_found' => 'طريقة الدفع غير موجودة',
    'unauthorized_action' => 'إجراء غير مصرح به',
    'cannot_set_expired_default' => 'لا يمكن تعيين بطاقة منتهية الصلاحية كافتراضية',
    'default_updated' => 'تم تحديث طريقة الدفع الافتراضية بنجاح',
    'default_update_failed' => 'فشل في تحديث طريقة الدفع الافتراضية',
    'method_deleted_success' => 'تم حذف طريقة الدفع بنجاح',
    'method_delete_failed' => 'فشل في حذف طريقة الدفع',
];
