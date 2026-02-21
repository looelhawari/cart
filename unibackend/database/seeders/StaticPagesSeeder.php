<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StaticPagesSeeder extends Seeder
{
    /**
     * Seed professional content for static pages.
     */
    public function run(): void
    {
        // Terms and Conditions
        DB::table('static_pages')
            ->where('slug', 'terms')
            ->update([
                'title_en' => 'Terms and Conditions',
                'title_ar' => 'الشروط والأحكام',
                'content_en' => $this->getTermsContentEn(),
                'content_ar' => $this->getTermsContentAr(),
                'last_updated_at' => now(),
                'updated_at' => now(),
            ]);

        // Privacy Policy
        DB::table('static_pages')
            ->where('slug', 'privacy')
            ->update([
                'title_en' => 'Privacy Policy',
                'title_ar' => 'سياسة الخصوصية',
                'content_en' => $this->getPrivacyContentEn(),
                'content_ar' => $this->getPrivacyContentAr(),
                'last_updated_at' => now(),
                'updated_at' => now(),
            ]);

        // About Us
        DB::table('static_pages')
            ->where('slug', 'about')
            ->update([
                'title_en' => 'About CART',
                'title_ar' => 'عن البركة',
                'content_en' => $this->getAboutContentEn(),
                'content_ar' => $this->getAboutContentAr(),
                'last_updated_at' => now(),
                'updated_at' => now(),
            ]);
    }

    private function getTermsContentEn(): string
    {
        return <<<HTML
<h1>Terms and Conditions</h1>

<h2>1. Acceptance of Terms</h2>
<p>By accessing and using the CART mobile application ("App"), you accept and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our services.</p>

<h2>2. Use of Service</h2>
<p>CART grants you a limited, non-exclusive, non-transferable license to use the App for personal, non-commercial purposes. You agree to use the App only for lawful purposes and in accordance with these Terms.</p>

<h2>3. Account Registration</h2>
<p>To access certain features, you must register for an account. You agree to:</p>
<ul>
<li>Provide accurate and complete registration information</li>
<li>Maintain the security of your account credentials</li>
<li>Notify us immediately of any unauthorized access</li>
<li>Accept responsibility for all activities under your account</li>
</ul>

<h2>4. Orders and Payments</h2>
<p>All orders are subject to product availability and acceptance. We reserve the right to refuse or cancel any order. Payment must be made at the time of order placement through our secure payment system.</p>

<h2>5. Pricing and Promotions</h2>
<p>All prices are displayed in Egyptian Pounds (EGP) and include applicable taxes. Promotional offers are subject to specific terms and conditions and may be modified or discontinued at any time.</p>

<h2>6. Delivery Policy</h2>
<p>We strive to deliver your orders within the estimated timeframe. However, delivery times may vary based on location, traffic, and other factors. Standard delivery is typically completed within 1-2 hours in our service area.</p>

<h2>7. Returns and Refunds</h2>
<p>We accept returns for damaged or incorrect items within 24 hours of delivery. To initiate a return, please contact our customer support team with your order details and photos of the issue.</p>

<h2>8. Product Quality</h2>
<p>We are committed to providing high-quality products. All fresh items are carefully selected and handled with proper care during storage and delivery.</p>

<h2>9. Privacy</h2>
<p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.</p>

<h2>10. Limitation of Liability</h2>
<p>CART shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.</p>

<h2>11. Intellectual Property</h2>
<p>All content, trademarks, and intellectual property on the App are owned by CART. You may not reproduce, distribute, or create derivative works without our prior written consent.</p>

<h2>12. Changes to Terms</h2>
<p>We reserve the right to modify these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms. We will notify you of significant changes through the App or email.</p>

<h2>13. Governing Law</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt.</p>

<h2>14. Contact Us</h2>
<p>For questions about these Terms and Conditions, please contact us at:</p>
<p><strong>Email:</strong> support@elbaraka.com</p>
<p><strong>Phone:</strong> +20 123 456 789</p>
HTML;
    }

    private function getTermsContentAr(): string
    {
        return <<<HTML
<h1>الشروط والأحكام</h1>

<h2>1. قبول الشروط</h2>
<p>من خلال الوصول إلى تطبيق البركة للهاتف المحمول واستخدامه، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، فلا يجوز لك استخدام خدماتنا.</p>

<h2>2. استخدام الخدمة</h2>
<p>تمنحك البركة ترخيصًا محدودًا وغير حصري وغير قابل للتحويل لاستخدام التطبيق لأغراض شخصية غير تجارية. أنت توافق على استخدام التطبيق فقط لأغراض مشروعة ووفقًا لهذه الشروط.</p>

<h2>3. تسجيل الحساب</h2>
<p>للوصول إلى ميزات معينة، يجب عليك التسجيل للحصول على حساب. أنت توافق على:</p>
<ul>
<li>تقديم معلومات تسجيل دقيقة وكاملة</li>
<li>الحفاظ على أمان بيانات اعتماد حسابك</li>
<li>إخطارنا فورًا بأي وصول غير مصرح به</li>
<li>قبول المسؤولية عن جميع الأنشطة تحت حسابك</li>
</ul>

<h2>4. الطلبات والمدفوعات</h2>
<p>تخضع جميع الطلبات لتوفر المنتج والقبول. نحتفظ بالحق في رفض أو إلغاء أي طلب. يجب الدفع في وقت تقديم الطلب من خلال نظام الدفع الآمن لدينا.</p>

<h2>5. الأسعار والعروض الترويجية</h2>
<p>يتم عرض جميع الأسعار بالجنيه المصري وتشمل الضرائب المطبقة. تخضع العروض الترويجية لشروط وأحكام محددة ويمكن تعديلها أو إيقافها في أي وقت.</p>

<h2>6. سياسة التوصيل</h2>
<p>نسعى جاهدين لتوصيل طلباتك خلال الإطار الزمني المقدر. ومع ذلك، قد تختلف أوقات التوصيل بناءً على الموقع وحركة المرور وعوامل أخرى. يتم التوصيل القياسي عادةً في غضون 1-2 ساعة في منطقة خدمتنا.</p>

<h2>7. الإرجاع واسترداد الأموال</h2>
<p>نقبل الإرجاع للعناصر التالفة أو غير الصحيحة في غضون 24 ساعة من التوصيل. لبدء الإرجاع، يرجى الاتصال بفريق دعم العملاء لدينا مع تفاصيل طلبك وصور المشكلة.</p>

<h2>8. جودة المنتج</h2>
<p>نحن ملتزمون بتقديم منتجات عالية الجودة. يتم اختيار جميع العناصر الطازجة بعناية والتعامل معها بعناية مناسبة أثناء التخزين والتوصيل.</p>

<h2>9. الخصوصية</h2>
<p>خصوصيتك مهمة بالنسبة لنا. يرجى مراجعة سياسة الخصوصية الخاصة بنا لفهم كيفية جمع معلوماتك الشخصية واستخدامها وحمايتها.</p>

<h2>10. تحديد المسؤولية</h2>
<p>لن تكون البركة مسؤولة عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية ناتجة عن استخدامك أو عدم قدرتك على استخدام الخدمة.</p>

<h2>11. الملكية الفكرية</h2>
<p>جميع المحتويات والعلامات التجارية والملكية الفكرية في التطبيق مملوكة للبركة. لا يجوز لك إعادة إنتاج أو توزيع أو إنشاء أعمال مشتقة دون موافقتنا الخطية المسبقة.</p>

<h2>12. التغييرات على الشروط</h2>
<p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. استمرار استخدام التطبيق بعد التغييرات يشكل قبولًا للشروط الجديدة. سنخطرك بالتغييرات المهمة من خلال التطبيق أو البريد الإلكتروني.</p>

<h2>13. القانون الحاكم</h2>
<p>تخضع هذه الشروط وتُفسر وفقًا لقوانين جمهورية مصر العربية.</p>

<h2>14. اتصل بنا</h2>
<p>للاستفسارات حول هذه الشروط والأحكام، يرجى الاتصال بنا على:</p>
<p><strong>البريد الإلكتروني:</strong> support@elbaraka.com</p>
<p><strong>الهاتف:</strong> 789 456 123 20+</p>
HTML;
    }

    private function getPrivacyContentEn(): string
    {
        return <<<HTML
<h1>Privacy Policy</h1>

<h2>Your Privacy Matters</h2>
<p>At CART, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our mobile application.</p>

<h2>1. Information We Collect</h2>
<p>We collect information that you provide directly to us, including:</p>
<ul>
<li><strong>Personal Information:</strong> Name, email address, phone number</li>
<li><strong>Delivery Information:</strong> Address, location data, delivery instructions</li>
<li><strong>Payment Information:</strong> Card details (processed securely through our payment provider)</li>
<li><strong>Order History:</strong> Your previous orders and preferences</li>
<li><strong>Device Information:</strong> Device type, operating system, unique identifiers</li>
</ul>

<h2>2. How We Use Your Information</h2>
<p>We use the collected information for the following purposes:</p>
<ul>
<li>Processing and fulfilling your orders</li>
<li>Providing customer support and responding to inquiries</li>
<li>Sending order confirmations and delivery updates</li>
<li>Improving our services and user experience</li>
<li>Personalizing your app experience</li>
<li>Sending promotional offers (with your consent)</li>
<li>Preventing fraud and ensuring security</li>
</ul>

<h2>3. Information Sharing</h2>
<p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
<ul>
<li><strong>Delivery Partners:</strong> To fulfill your orders</li>
<li><strong>Payment Processors:</strong> To process transactions securely</li>
<li><strong>Service Providers:</strong> Who assist in operating our platform</li>
<li><strong>Legal Authorities:</strong> When required by law</li>
</ul>

<h2>4. Data Security</h2>
<p>We implement industry-standard security measures to protect your personal information, including:</p>
<ul>
<li>SSL/TLS encryption for data transmission</li>
<li>Secure storage with access controls</li>
<li>Regular security audits and updates</li>
<li>Employee training on data protection</li>
</ul>

<h2>5. Your Rights</h2>
<p>You have the following rights regarding your personal data:</p>
<ul>
<li><strong>Access:</strong> Request a copy of your personal data</li>
<li><strong>Correction:</strong> Update inaccurate information</li>
<li><strong>Deletion:</strong> Request deletion of your account and data</li>
<li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
<li><strong>Data Portability:</strong> Request your data in a portable format</li>
</ul>

<h2>6. Cookies and Tracking</h2>
<p>We use cookies and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content. You can manage cookie preferences in your device settings.</p>

<h2>7. Children's Privacy</h2>
<p>Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected such information, please contact us immediately.</p>

<h2>8. Data Retention</h2>
<p>We retain your personal information only for as long as necessary to provide our services and fulfill legal obligations. You can request deletion of your data at any time through your account settings or by contacting us.</p>

<h2>9. International Data Transfers</h2>
<p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during such transfers.</p>

<h2>10. Changes to This Policy</h2>
<p>We may update this Privacy Policy periodically. We will notify you of significant changes through the app or via email. Continued use of the service after changes constitutes acceptance.</p>

<h2>11. Contact Us</h2>
<p>For questions, concerns, or requests regarding your privacy, please contact us:</p>
<p><strong>Email:</strong> privacy@elbaraka.com</p>
<p><strong>Phone:</strong> +20 123 456 789</p>
<p><strong>Address:</strong> 123 Main Street, Cairo, Egypt</p>
HTML;
    }

    private function getPrivacyContentAr(): string
    {
        return <<<HTML
<h1>سياسة الخصوصية</h1>

<h2>خصوصيتك تهمنا</h2>
<p>في البركة، نحن ملتزمون بحماية خصوصيتك وضمان أمان معلوماتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع بياناتك واستخدامها والإفصاح عنها وحمايتها عند استخدام تطبيقنا للهاتف المحمول.</p>

<h2>1. المعلومات التي نجمعها</h2>
<p>نجمع المعلومات التي تقدمها لنا مباشرة، بما في ذلك:</p>
<ul>
<li><strong>المعلومات الشخصية:</strong> الاسم، عنوان البريد الإلكتروني، رقم الهاتف</li>
<li><strong>معلومات التوصيل:</strong> العنوان، بيانات الموقع، تعليمات التوصيل</li>
<li><strong>معلومات الدفع:</strong> تفاصيل البطاقة (تتم معالجتها بشكل آمن من خلال مزود الدفع لدينا)</li>
<li><strong>سجل الطلبات:</strong> طلباتك السابقة وتفضيلاتك</li>
<li><strong>معلومات الجهاز:</strong> نوع الجهاز، نظام التشغيل، المعرفات الفريدة</li>
</ul>

<h2>2. كيف نستخدم معلوماتك</h2>
<p>نستخدم المعلومات المجمعة للأغراض التالية:</p>
<ul>
<li>معالجة وتنفيذ طلباتك</li>
<li>تقديم دعم العملاء والرد على الاستفسارات</li>
<li>إرسال تأكيدات الطلب وتحديثات التوصيل</li>
<li>تحسين خدماتنا وتجربة المستخدم</li>
<li>تخصيص تجربتك في التطبيق</li>
<li>إرسال عروض ترويجية (بموافقتك)</li>
<li>منع الاحتيال وضمان الأمان</li>
</ul>

<h2>3. مشاركة المعلومات</h2>
<p>نحن لا نبيع أو نتاجر أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك مع:</p>
<ul>
<li><strong>شركاء التوصيل:</strong> لتنفيذ طلباتك</li>
<li><strong>معالجي الدفع:</strong> لمعالجة المعاملات بشكل آمن</li>
<li><strong>مقدمي الخدمات:</strong> الذين يساعدون في تشغيل منصتنا</li>
<li><strong>السلطات القانونية:</strong> عند الاقتضاء بموجب القانون</li>
</ul>

<h2>4. أمان البيانات</h2>
<p>نطبق إجراءات أمان معيارية في الصناعة لحماية معلوماتك الشخصية، بما في ذلك:</p>
<ul>
<li>تشفير SSL/TLS لنقل البيانات</li>
<li>تخزين آمن مع ضوابط الوصول</li>
<li>عمليات تدقيق وتحديثات أمنية منتظمة</li>
<li>تدريب الموظفين على حماية البيانات</li>
</ul>

<h2>5. حقوقك</h2>
<p>لديك الحقوق التالية فيما يتعلق ببياناتك الشخصية:</p>
<ul>
<li><strong>الوصول:</strong> طلب نسخة من بياناتك الشخصية</li>
<li><strong>التصحيح:</strong> تحديث المعلومات غير الدقيقة</li>
<li><strong>الحذف:</strong> طلب حذف حسابك وبياناتك</li>
<li><strong>إلغاء الاشتراك:</strong> إلغاء الاشتراك من الاتصالات التسويقية</li>
<li><strong>قابلية نقل البيانات:</strong> طلب بياناتك بتنسيق قابل للنقل</li>
</ul>

<h2>6. ملفات تعريف الارتباط والتتبع</h2>
<p>نستخدم ملفات تعريف الارتباط والتقنيات المشابهة لتحسين تجربتك وتحليل أنماط الاستخدام وتقديم محتوى مخصص. يمكنك إدارة تفضيلات ملفات تعريف الارتباط في إعدادات جهازك.</p>

<h2>7. خصوصية الأطفال</h2>
<p>خدماتنا غير مخصصة للأطفال دون سن 13 عامًا. نحن لا نجمع معلومات شخصية من الأطفال عن علم. إذا كنت تعتقد أننا جمعنا مثل هذه المعلومات، يرجى الاتصال بنا فورًا.</p>

<h2>8. الاحتفاظ بالبيانات</h2>
<p>نحتفظ بمعلوماتك الشخصية فقط طالما كان ذلك ضروريًا لتقديم خدماتنا والوفاء بالالتزامات القانونية. يمكنك طلب حذف بياناتك في أي وقت من خلال إعدادات حسابك أو بالاتصال بنا.</p>

<h2>9. نقل البيانات الدولية</h2>
<p>قد يتم نقل معلوماتك ومعالجتها في بلدان غير بلدك. نضمن وجود ضمانات مناسبة لحماية بياناتك أثناء عمليات النقل هذه.</p>

<h2>10. التغييرات على هذه السياسة</h2>
<p>قد نقوم بتحديث سياسة الخصوصية هذه بشكل دوري. سنخطرك بالتغييرات المهمة من خلال التطبيق أو عبر البريد الإلكتروني. استمرار استخدام الخدمة بعد التغييرات يشكل قبولًا.</p>

<h2>11. اتصل بنا</h2>
<p>للاستفسارات أو المخاوف أو الطلبات المتعلقة بخصوصيتك، يرجى الاتصال بنا:</p>
<p><strong>البريد الإلكتروني:</strong> privacy@elbaraka.com</p>
<p><strong>الهاتف:</strong> 789 456 123 20+</p>
<p><strong>العنوان:</strong> 123 الشارع الرئيسي، القاهرة، مصر</p>
HTML;
    }

    private function getAboutContentEn(): string
    {
        return <<<HTML
<h1>Welcome to CART</h1>

<h2>Who We Are</h2>
<p>CART is your trusted online hypermarket, bringing fresh groceries and daily essentials directly to your doorstep. Since our founding, we've been committed to making grocery shopping effortless and enjoyable for families across Egypt.</p>

<h2>Our Mission</h2>
<p>To revolutionize the way people shop for groceries by delivering fresh, quality products with speed and convenience, while building lasting relationships with our customers through exceptional service.</p>

<h2>Our Vision</h2>
<p>To become the leading online grocery platform in Egypt, known for quality, reliability, and customer satisfaction.</p>

<h2>Our Values</h2>
<ul>
<li><strong>Quality:</strong> We source only the finest products from trusted suppliers</li>
<li><strong>Freshness:</strong> Our cold chain ensures products arrive fresh</li>
<li><strong>Convenience:</strong> Easy ordering and fast delivery to your door</li>
<li><strong>Trust:</strong> Transparent pricing with no hidden fees</li>
<li><strong>Service:</strong> Customer satisfaction is our top priority</li>
<li><strong>Innovation:</strong> Continuously improving our technology and services</li>
</ul>

<h2>Why Choose Us</h2>
<p>With thousands of products, competitive prices, and delivery in as fast as 1 hour, CART makes grocery shopping simple. Our dedicated team works around the clock to ensure you receive the best shopping experience.</p>

<h3>What Sets Us Apart:</h3>
<ul>
<li>Wide selection of fresh produce, meats, dairy, and pantry essentials</li>
<li>Competitive prices and regular promotions</li>
<li>Fast and reliable delivery service</li>
<li>Easy-to-use mobile app</li>
<li>Dedicated customer support team</li>
<li>Secure payment options</li>
</ul>

<h2>Our Commitment</h2>
<p>At CART, we believe that everyone deserves access to quality groceries without the hassle. We're constantly working to improve our services, expand our product range, and enhance your shopping experience.</p>

<p>Thank you for choosing CART. We look forward to serving you!</p>
HTML;
    }

    private function getAboutContentAr(): string
    {
        return <<<HTML
<h1>مرحباً بكم في البركة</h1>

<h2>من نحن</h2>
<p>البركة هو هايبر ماركت إلكتروني موثوق، يقدم لكم المنتجات الطازجة والمستلزمات اليومية مباشرة إلى باب منزلكم. منذ تأسيسنا، التزمنا بجعل تجربة التسوق سهلة وممتعة للعائلات في جميع أنحاء مصر.</p>

<h2>مهمتنا</h2>
<p>إحداث ثورة في طريقة تسوق البقالة من خلال توصيل منتجات طازجة وعالية الجودة بسرعة وراحة، مع بناء علاقات دائمة مع عملائنا من خلال خدمة استثنائية.</p>

<h2>رؤيتنا</h2>
<p>أن نصبح منصة البقالة الإلكترونية الرائدة في مصر، المعروفة بالجودة والموثوقية ورضا العملاء.</p>

<h2>قيمنا</h2>
<ul>
<li><strong>الجودة:</strong> نختار فقط أفضل المنتجات من الموردين الموثوقين</li>
<li><strong>الطزاجة:</strong> سلسلة التبريد لدينا تضمن وصول المنتجات طازجة</li>
<li><strong>الراحة:</strong> طلب سهل وتوصيل سريع إلى باب منزلك</li>
<li><strong>الثقة:</strong> أسعار شفافة بدون رسوم مخفية</li>
<li><strong>الخدمة:</strong> رضا العملاء هو أولويتنا القصوى</li>
<li><strong>الابتكار:</strong> تحسين مستمر لتقنياتنا وخدماتنا</li>
</ul>

<h2>لماذا تختارنا</h2>
<p>مع آلاف المنتجات والأسعار التنافسية والتوصيل في أقل من ساعة، البركة يجعل تسوق البقالة بسيطاً. فريقنا المتفاني يعمل على مدار الساعة لضمان حصولكم على أفضل تجربة تسوق.</p>

<h3>ما يميزنا:</h3>
<ul>
<li>تشكيلة واسعة من المنتجات الطازجة واللحوم والألبان والمنتجات الأساسية</li>
<li>أسعار تنافسية وعروض ترويجية منتظمة</li>
<li>خدمة توصيل سريعة وموثوقة</li>
<li>تطبيق جوال سهل الاستخدام</li>
<li>فريق دعم عملاء متخصص</li>
<li>خيارات دفع آمنة</li>
</ul>

<h2>التزامنا</h2>
<p>في البركة، نؤمن بأن الجميع يستحق الوصول إلى منتجات بقالة عالية الجودة دون أي متاعب. نعمل باستمرار على تحسين خدماتنا وتوسيع نطاق منتجاتنا وتعزيز تجربة التسوق الخاصة بكم.</p>

<p>شكراً لاختياركم البركة. نتطلع لخدمتكم!</p>
HTML;
    }
}
