<?php

return [
    // Rate limiting
    'wait_before_cancel' => 'يرجى الانتظار :seconds ثانية قبل محاولة الإلغاء مرة أخرى.',

    // Order status checks
    'already_cancelling' => 'يتم إلغاء هذا الطلب بالفعل. يرجى الانتظار.',
    'already_cancelled_or_failed' => 'تم إلغاء هذا الطلب بالفعل أو فشل.',
    'cannot_cancel_delivered' => 'لا يمكن إلغاء طلب تم تسليمه. استخدم عملية الإرجاع/الاسترداد بدلاً من ذلك.',
    'cannot_cancel_out_for_delivery' => 'لا يمكن إلغاء طلب قيد التوصيل.',

    // Partial refund
    'partial_refund_status_error' => 'يمكنك طلب استرداد جزئي فقط للطلبات المؤكدة أو قيد التحضير أو المسلمة.',
    'partial_refund_card_only' => 'الاسترداد الجزئي متاح فقط للطلبات المدفوعة بالبطاقة.',
    'no_payment_found' => 'لم يتم العثور على دفعة ناجحة لهذا الطلب.',
    'no_valid_items' => 'لم يتم العثور على عناصر صالحة للاسترداد. قد تكون العناصر قد استردت بالفعل.',
    'refund_exceeds_remaining' => 'مبلغ الاسترداد (:amount) يتجاوز المبلغ القابل للاسترداد المتبقي (:remaining).',
    'refund_already_processed' => 'تمت معالجة هذا الاسترداد بالفعل.',
    'partial_refund_success' => 'تم استرداد :amount :currency جزئياً بنجاح.',

    // Item cancellation (COD)
    'items_cancelled_success' => 'تم إلغاء العناصر بنجاح. تم خصم :amount :currency من طلبك.',

    // Full order cancellation
    'no_payment_no_refund' => 'تم إلغاء الطلب. لم يتم إكمال أي دفعة، لذا لا حاجة للاسترداد.',
    'refund_already_done' => 'تم إلغاء الطلب. تمت معالجة الاسترداد بالفعل لهذا الطلب.',
    'refund_already_processed_cancel' => 'تم إلغاء الطلب. تمت معالجة الاسترداد بالفعل.',
    'cod_cancelled_no_refund' => 'تم إلغاء الطلب بنجاح. لا حاجة للاسترداد لطلبات الدفع عند الاستلام.',

    // Refund processing
    'full_refund_success' => 'تم إلغاء الطلب. سيتم إرجاع المبلغ الكامل :amount :currency إلى بطاقتك خلال ٣-٥ أيام عمل.',
    'penalty_refund_success' => 'تم إلغاء الطلب. سيتم إرجاع :amount :currency (بعد خصم غرامة :penalty%) إلى بطاقتك خلال ٣-٥ أيام عمل.',

    // Error messages
    'order_not_found' => 'الطلب غير موجود أو لا ينتمي إليك',
    'auth_required' => 'المصادقة مطلوبة',
    'system_error' => 'حدث خطأ في النظام أثناء معالجة الإلغاء. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.',
    'unexpected_error' => 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.',

    // Cancellation eligibility
    'can_cancel' => 'يمكن إلغاء هذا الطلب.',
    'cannot_cancel' => 'لا يمكن إلغاء هذا الطلب.',
    'cancel_with_penalty' => 'سيتم فرض غرامة بنسبة :percent% على الإلغاء.',
    'estimated_days' => '٥-١٤ يوم عمل',

    // Controller messages
    'validation_failed' => 'فشل التحقق',
    'auth_required_login' => 'المصادقة مطلوبة. يرجى تسجيل الدخول لتقديم طلب.',
    'cart_empty' => 'السلة فارغة',
    'order_placed' => 'تم تقديم الطلب بنجاح',
    'order_not_found_short' => 'الطلب غير موجود',
    'failed_retrieve_orders' => 'فشل في استرجاع الطلبات',
    'failed_retrieve_order' => 'فشل في استرجاع الطلب',
    'failed_retrieve_tracking' => 'فشل في استرجاع بيانات التتبع',
    'cancelled_by_user' => 'تم الإلغاء بواسطة المستخدم',
    'failed_cancel_check' => 'فشل في التحقق من أهلية الإلغاء. يرجى المحاولة مرة أخرى.',
    'failed_refund_history' => 'فشل في استرجاع سجل الاسترداد. يرجى المحاولة مرة أخرى.',
    'items_added_to_cart' => 'تمت إضافة العناصر إلى السلة',
    'failed_reorder' => 'فشل في إعادة الطلب',
    'no_email_on_account' => 'لا يوجد بريد إلكتروني في حسابك. يرجى إضافته في ملفك الشخصي.',
    'unable_generate_invoice_pdf' => 'تعذر إنشاء فاتورة PDF. يرجى المحاولة لاحقاً.',
    'invoice_sent_to' => 'تم إرسال الفاتورة إلى :email',
    'failed_send_invoice' => 'فشل في إرسال بريد الفاتورة. يرجى المحاولة مرة أخرى.',
    'failed_generate_invoice_data' => 'فشل في إنشاء بيانات الفاتورة.',
    'failed_generate_invoice' => 'فشل في إنشاء الفاتورة.',

    // Order status labels
    'status_pending' => 'قيد الانتظار',
    'status_pending_payment' => 'في انتظار الدفع',
    'status_confirmed' => 'تم التأكيد',
    'status_preparing' => 'جاري التجهيز',
    'status_out_for_delivery' => 'في الطريق',
    'status_delivered' => 'تم التوصيل',
    'status_cancelled' => 'ملغي',
    'status_failed' => 'فشل',
    'status_unknown' => 'غير معروف',

    // Payment status labels
    'payment_status_pending' => 'قيد الانتظار',
    'payment_status_completed' => 'مكتمل',
    'payment_status_failed' => 'فشل',
    'payment_status_refunded' => 'مسترد',
    'payment_status_partially_refunded' => 'مسترد جزئياً',
    'payment_status_unknown' => 'غير معروف',

    // Cancellation eligibility reasons
    'eligibility_already_cancelled' => 'تم إلغاء هذا الطلب بالفعل.',
    'eligibility_currently_cancelling' => 'يتم إلغاء هذا الطلب حالياً.',
    'eligibility_cod_can_cancel' => 'سيتم إلغاء الطلب وإعادة المنتجات للمخزون.',
    'eligibility_full_refund' => 'سيتم استرداد المبلغ الكامل إلى بطاقتك. عادةً ما يستغرق الاسترداد :days.',
    'eligibility_full_refund_with_previous' => 'سيتم استرداد المبلغ المتبقي (:estimated ج.م) إلى بطاقتك. المسترد سابقاً: :already ج.م. عادةً ما يستغرق الاسترداد :days.',
    'eligibility_penalty_refund' => 'سيتم خصم رسوم تحضير بنسبة :penalty%. ستحصل على :refund ج.م (:percent% من إجمالي الطلب) إلى بطاقتك خلال :days.',
    'eligibility_penalty_refund_with_previous' => 'سيتم خصم رسوم تحضير بنسبة :penalty% من المبلغ المتبقي. ستحصل على :refund ج.م (:percent% من :remaining ج.م المتبقية) إلى بطاقتك خلال :days.',
    'blocked_out_for_delivery' => 'طلبك في الطريق بالفعل ولا يمكن إلغاؤه. يرجى رفض الاستلام أو التواصل مع فريق الدعم.',
    'blocked_delivered' => 'تم تسليم هذا الطلب ولا يمكن إلغاؤه. يرجى التواصل مع الدعم للإرجاع.',
    'blocked_already_cancelled' => 'تم إلغاء هذا الطلب بالفعل.',
    'blocked_already_failed' => 'فشل هذا الطلب بالفعل.',
    'blocked_default' => 'لا يمكن إلغاء هذا الطلب في حالته الحالية.',

    // Timeline labels
    'timeline_placed' => 'تم تقديم الطلب',
    'timeline_confirmed' => 'تم تأكيد الطلب',
    'timeline_preparing' => 'جاري تحضير طلبك',
    'timeline_out_for_delivery' => 'في الطريق إليك',
    'timeline_delivered' => 'تم التوصيل',
];
