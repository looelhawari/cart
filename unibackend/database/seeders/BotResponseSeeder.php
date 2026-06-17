<?php

namespace Database\Seeders;

use App\Models\BotResponse;
use Illuminate\Database\Seeder;

class BotResponseSeeder extends Seeder
{
    public function run(): void
    {
        $responses = [
            // Greeting responses
            [
                'intent' => 'greeting',
                'category' => null,
                'keywords' => ['hello', 'hi', 'hey', 'good morning', 'good evening', 'مرحبا', 'اهلا', 'السلام عليكم', 'صباح الخير', 'مساء الخير'],
                'response_en' => "Hello! 👋 Welcome to CART Support! I'm your virtual assistant.\n\nHow can I help you today?\n\n• 📦 Track your order\n• 💳 Payment issues\n• 🚚 Delivery questions\n• 📞 Talk to an agent",
                'response_ar' => "مرحباً! 👋 أهلاً بك في دعم CART! أنا مساعدك الافتراضي.\n\nكيف يمكنني مساعدتك اليوم؟\n\n• 📦 تتبع طلبك\n• 💳 مشاكل الدفع\n• 🚚 أسئلة التوصيل\n• 📞 التحدث مع موظف",
                'action_type' => null,
                'priority' => 100,
            ],

            // Order status - Order issue category
            [
                'intent' => 'order_status',
                'category' => 'order_issue',
                'keywords' => ['order status', 'my order', 'where is my order', 'order update', 'حالة الطلب', 'فين طلبي', 'طلبي'],
                'response_en' => "I understand you're asking about your order! 📦\n\nI can see this ticket is related to an order. Let me check the status for you.\n\nIn the meantime, could you tell me more about the issue you're experiencing?",
                'response_ar' => "أفهم أنك تسأل عن طلبك! 📦\n\nأرى أن هذه التذكرة متعلقة بطلب. دعني أتحقق من الحالة لك.\n\nفي هذه الأثناء، هل يمكنك إخباري بالمزيد عن المشكلة التي تواجهها؟",
                'action_type' => 'show_order',
                'priority' => 90,
            ],

            // Delivery questions
            [
                'intent' => 'delivery',
                'category' => 'delivery_problem',
                'keywords' => ['delivery', 'deliver', 'shipping', 'late', 'not arrived', 'delayed', 'توصيل', 'شحن', 'متأخر', 'ما وصل'],
                'response_en' => "I'm sorry to hear about the delivery issue! 🚚\n\nOur delivery times are:\n• Standard: 1-3 business days\n• Express: Same day (before 2 PM)\n\nIf your order is delayed beyond these times, I recommend connecting with an agent who can track it in real-time.\n\nWould you like me to connect you?",
                'response_ar' => "أنا آسف لسماع مشكلة التوصيل! 🚚\n\nأوقات التوصيل لدينا هي:\n• العادي: 1-3 أيام عمل\n• السريع: نفس اليوم (قبل 2 مساءً)\n\nإذا تأخر طلبك عن هذه الأوقات، أنصح بالتواصل مع موظف يمكنه تتبعه بشكل مباشر.\n\nهل تريد أن أوصلك؟",
                'action_type' => 'suggest_escalate',
                'priority' => 85,
            ],

            // Payment issues
            [
                'intent' => 'payment',
                'category' => 'payment_issue',
                'keywords' => ['payment', 'pay', 'charge', 'charged', 'card', 'visa', 'transaction', 'دفع', 'بطاقة', 'فيزا', 'معاملة', 'خصم'],
                'response_en' => "I see you're having a payment concern! 💳\n\nPayment issues can be sensitive, so I recommend speaking with an agent who can securely verify and resolve this.\n\nCommon payment issues we handle:\n• Double charges (will be refunded)\n• Failed payments\n• Refund status\n\nShall I connect you with an agent?",
                'response_ar' => "أرى أن لديك مشكلة في الدفع! 💳\n\nمشاكل الدفع حساسة، لذا أنصح بالتحدث مع موظف يمكنه التحقق وحل هذا بشكل آمن.\n\nمشاكل الدفع الشائعة التي نتعامل معها:\n• الخصم المزدوج (سيتم استرداده)\n• الدفع الفاشل\n• حالة الاسترداد\n\nهل تريد أن أوصلك بموظف؟",
                'action_type' => 'suggest_escalate',
                'priority' => 95,
            ],

            // Product quality
            [
                'intent' => 'product_issue',
                'category' => 'product_quality',
                'keywords' => ['damaged', 'broken', 'wrong', 'bad', 'expired', 'quality', 'defective', 'تالف', 'مكسور', 'غلط', 'منتهي', 'جودة'],
                'response_en' => "I'm really sorry about the product quality issue! 😔\n\nWe take quality very seriously at CART. For product issues, our agents can:\n\n✅ Arrange a replacement\n✅ Process a refund\n✅ Offer store credit\n\nTo help faster, please:\n1. Take photos of the issue\n2. Keep the original packaging\n\nWould you like to speak with an agent now?",
                'response_ar' => "أنا آسف جداً بخصوص مشكلة جودة المنتج! 😔\n\nنحن نأخذ الجودة على محمل الجد في CART. بالنسبة لمشاكل المنتج، يمكن لموظفينا:\n\n✅ ترتيب استبدال\n✅ معالجة استرداد\n✅ تقديم رصيد متجر\n\nللمساعدة بشكل أسرع، يرجى:\n1. التقاط صور للمشكلة\n2. الاحتفاظ بالعبوة الأصلية\n\nهل تريد التحدث مع موظف الآن؟",
                'action_type' => 'suggest_escalate',
                'priority' => 90,
            ],

            // Refund
            [
                'intent' => 'refund',
                'category' => null,
                'keywords' => ['refund', 'money back', 'return', 'استرداد', 'فلوس', 'ترجيع', 'ارجاع'],
                'response_en' => "I understand you'd like a refund. 💰\n\n📋 Our Refund Policy:\n• Requests processed within 3-5 business days\n• Refunds go to original payment method\n• Cash orders refunded via wallet or bank transfer\n\n📝 To process your refund, I'll need:\n1. Your order number\n2. Reason for refund\n\nOr would you prefer to speak with an agent directly?",
                'response_ar' => "أفهم أنك تريد استرداد. 💰\n\n📋 سياسة الاسترداد لدينا:\n• يتم معالجة الطلبات خلال 3-5 أيام عمل\n• يتم الاسترداد لطريقة الدفع الأصلية\n• طلبات الدفع عند الاستلام تُسترد عبر المحفظة أو تحويل بنكي\n\n📝 لمعالجة استردادك، سأحتاج:\n1. رقم طلبك\n2. سبب الاسترداد\n\nأو هل تفضل التحدث مع موظف مباشرة؟",
                'action_type' => 'request_info',
                'priority' => 85,
            ],

            // Cancel order
            [
                'intent' => 'cancel_order',
                'category' => null,
                'keywords' => ['cancel', 'cancellation', 'stop order', 'الغاء', 'الغي', 'اوقف'],
                'response_en' => "I can help with order cancellation! ❌\n\n⚠️ Important:\n• Orders can only be cancelled before shipping\n• Shipped orders need to be returned after delivery\n• Refunds are processed within 3-5 business days\n\nPlease provide your order number, or would you like to speak with an agent?",
                'response_ar' => "يمكنني المساعدة في إلغاء الطلب! ❌\n\n⚠️ مهم:\n• يمكن إلغاء الطلبات فقط قبل الشحن\n• الطلبات المشحونة تحتاج للإرجاع بعد الاستلام\n• يتم معالجة الاسترداد خلال 3-5 أيام عمل\n\nيرجى تزويدي برقم الطلب، أو هل تريد التحدث مع موظف؟",
                'action_type' => 'request_order_id',
                'priority' => 80,
            ],

            // Technical issues
            [
                'intent' => 'technical',
                'category' => 'technical_issue',
                'keywords' => ['app', 'bug', 'error', 'not working', 'crash', 'login', 'التطبيق', 'خطأ', 'مش شغال', 'تسجيل دخول'],
                'response_en' => "I understand you're having a technical issue! 🔧\n\nHere are some quick fixes:\n\n1️⃣ **Update the app** - Check for updates in App Store/Play Store\n2️⃣ **Clear cache** - Go to Settings > Apps > CART > Clear Cache\n3️⃣ **Restart** - Close and reopen the app\n4️⃣ **Reinstall** - As a last resort\n\nIf the issue persists, would you like to speak with our technical support team?",
                'response_ar' => "أفهم أنك تواجه مشكلة تقنية! 🔧\n\nإليك بعض الحلول السريعة:\n\n1️⃣ **حدث التطبيق** - تحقق من التحديثات في المتجر\n2️⃣ **امسح الكاش** - اذهب إلى الإعدادات > التطبيقات > CART > مسح الكاش\n3️⃣ **أعد التشغيل** - أغلق وأعد فتح التطبيق\n4️⃣ **أعد التثبيت** - كحل أخير\n\nإذا استمرت المشكلة، هل تريد التحدث مع فريق الدعم التقني؟",
                'action_type' => null,
                'priority' => 75,
            ],

            // Promo/discount
            [
                'intent' => 'promo_code',
                'category' => null,
                'keywords' => ['promo', 'coupon', 'discount', 'code', 'offer', 'sale', 'كود', 'خصم', 'عرض', 'تخفيض'],
                'response_en' => "Looking for discounts? 🎉\n\nHere's where to find promo codes:\n\n📱 **In the app:**\n• Check the \"Promotions\" tab\n• Look for banner offers on the home screen\n\n📧 **From us:**\n• Email newsletters\n• SMS notifications\n\n💡 **Tip:** Make sure notifications are enabled to get exclusive deals!\n\nIs there anything else I can help with?",
                'response_ar' => "تبحث عن خصومات؟ 🎉\n\nإليك أماكن إيجاد أكواد الخصم:\n\n📱 **في التطبيق:**\n• تحقق من علامة \"العروض\"\n• ابحث عن عروض البانر في الصفحة الرئيسية\n\n📧 **منا:**\n• النشرات البريدية\n• إشعارات الرسائل القصيرة\n\n💡 **نصيحة:** تأكد من تفعيل الإشعارات للحصول على عروض حصرية!\n\nهل هناك شيء آخر يمكنني مساعدتك فيه؟",
                'action_type' => null,
                'priority' => 70,
            ],

            // Working hours
            [
                'intent' => 'working_hours',
                'category' => null,
                'keywords' => ['hours', 'open', 'close', 'time', 'when', 'مواعيد', 'فتح', 'اغلاق', 'وقت', 'امتى'],
                'response_en' => "Our working hours ⏰\n\n🏪 **Store Hours:**\nDaily: 8:00 AM - 12:00 AM (Midnight)\n\n📞 **Customer Support:**\nDaily: 9:00 AM - 11:00 PM\n\n🚚 **Delivery Hours:**\nDaily: 9:00 AM - 11:00 PM\n\n*Express delivery available until 8:00 PM*\n\nAnything else I can help with?",
                'response_ar' => "ساعات العمل ⏰\n\n🏪 **ساعات المتجر:**\nيومياً: 8:00 صباحاً - 12:00 منتصف الليل\n\n📞 **دعم العملاء:**\nيومياً: 9:00 صباحاً - 11:00 مساءً\n\n🚚 **ساعات التوصيل:**\nيومياً: 9:00 صباحاً - 11:00 مساءً\n\n*التوصيل السريع متاح حتى 8:00 مساءً*\n\nهل هناك شيء آخر يمكنني مساعدتك فيه؟",
                'action_type' => null,
                'priority' => 60,
            ],

            // Thanks
            [
                'intent' => 'thanks',
                'category' => null,
                'keywords' => ['thank', 'thanks', 'appreciate', 'helpful', 'شكرا', 'متشكر', 'تمام'],
                'response_en' => "You're welcome! 😊\n\nI'm glad I could help. Is there anything else you'd like to know?\n\nIf your issue is resolved, feel free to close this ticket. Have a great day! 🌟",
                'response_ar' => "عفواً! 😊\n\nأنا سعيد أنني استطعت المساعدة. هل هناك أي شيء آخر تود معرفته؟\n\nإذا تم حل مشكلتك، يمكنك إغلاق هذه التذكرة. يوماً سعيداً! 🌟",
                'action_type' => 'suggest_close',
                'priority' => 50,
            ],

            // Goodbye
            [
                'intent' => 'goodbye',
                'category' => null,
                'keywords' => ['bye', 'goodbye', 'see you', 'later', 'مع السلامة', 'باي', 'سلام'],
                'response_en' => "Thank you for contacting CART Support! 👋\n\nWe hope we were able to help you today. Don't forget to rate your experience!\n\nHave a wonderful day and happy shopping! 🛒🌟",
                'response_ar' => "شكراً لتواصلك مع دعم CART! 👋\n\nنأمل أننا استطعنا مساعدتك اليوم. لا تنسى تقييم تجربتك!\n\nيوماً سعيداً وتسوقاً ممتعاً! 🛒🌟",
                'action_type' => 'suggest_close',
                'priority' => 50,
            ],

            // Escalate to agent
            [
                'intent' => 'escalate',
                'category' => null,
                'keywords' => ['agent', 'human', 'person', 'representative', 'support', 'real person', 'موظف', 'حد يساعدني', 'خدمة عملاء', 'انسان'],
                'response_en' => "I'll connect you with a support agent right away! 🎧\n\nAn agent will respond to your message shortly. Our average response time is under 5 minutes during working hours (9 AM - 11 PM).\n\nThank you for your patience!",
                'response_ar' => "سأوصلك بموظف دعم فوراً! 🎧\n\nسيرد موظف على رسالتك قريباً. متوسط وقت الرد لدينا أقل من 5 دقائق خلال ساعات العمل (9 صباحاً - 11 مساءً).\n\nشكراً لصبرك!",
                'action_type' => 'escalate',
                'priority' => 100,
            ],
        ];

        foreach ($responses as $response) {
            BotResponse::updateOrCreate(
                ['intent' => $response['intent'], 'category' => $response['category']],
                $response
            );
        }
    }
}
