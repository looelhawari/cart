import React from "react";
import { FileText } from "lucide-react-native";
import Colors from "@/constants/Colors";
import StaticPageScreen from "@/components/StaticPageScreen";

// Comprehensive Terms and Conditions
const FALLBACK_CONTENT = `
<h1>Terms and Conditions</h1>

<p><strong>Cart is operated by Al Baraka Market.</strong></p>

<h2>1. Acceptance of Terms</h2>
<p>By downloading, installing, accessing, or using the CART mobile application ("App"), you accept and agree to be bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, you must not use our services.</p>
<p>These Terms constitute a legally binding agreement between you ("User", "you", "your") and CART ("we", "us", "our").</p>

<h2>2. Eligibility</h2>
<p>To use our services, you must:</p>
<ul>
<li>Be at least 18 years of age or have parental/guardian consent</li>
<li>Have the legal capacity to enter into a binding agreement</li>
<li>Reside within our delivery service areas</li>
<li>Provide accurate and truthful information during registration</li>
</ul>

<h2>3. Account Registration and Security</h2>
<p>To access certain features, you must register for an account. You agree to:</p>
<ul>
<li>Provide accurate, current, and complete registration information</li>
<li>Maintain and promptly update your account information</li>
<li>Maintain the confidentiality and security of your account credentials</li>
<li>Immediately notify us of any unauthorized access to your account</li>
<li>Accept full responsibility for all activities that occur under your account</li>
<li>Not share your account credentials with any third party</li>
</ul>
<p>We support sign-in via email/password, Google, and Apple. By using social login, you authorize us to access your name and email address from those providers.</p>

<h2>4. Use of Service</h2>
<p>CART grants you a limited, non-exclusive, non-transferable, revocable license to use the App for personal, non-commercial purposes. You agree not to:</p>
<ul>
<li>Use the App for any unlawful or fraudulent purpose</li>
<li>Interfere with or disrupt the App's security features or server infrastructure</li>
<li>Attempt to reverse-engineer, decompile, or disassemble the App</li>
<li>Use automated bots, scrapers, or similar tools to access the App</li>
<li>Circumvent any rate limiting, access controls, or security measures</li>
<li>Impersonate any person or entity or falsely represent your affiliation</li>
<li>Submit false reviews, ratings, or complaints</li>
<li>Use the App to harass, abuse, or harm other users or our staff</li>
</ul>

<h2>5. Products and Pricing</h2>
<ul>
<li>All products are subject to availability. We reserve the right to discontinue any product at any time.</li>
<li>Prices are displayed in Egyptian Pounds.</li>
<li>We make every effort to display accurate pricing. In the event of a pricing error, we reserve the right to cancel orders placed at incorrect prices.</li>
<li>Promotional offers, discounts, and coupon codes are subject to specific terms, expiration dates, and usage limits as indicated at the time of the offer.</li>
<li>Product images are for illustration purposes. Actual products may vary slightly in appearance.</li>
<li>Product weights may vary slightly from listed amounts for fresh produce and deli items.</li>
</ul>

<h2>6. Orders and Payments</h2>
<p>All orders are subject to product availability and acceptance by CART. We reserve the right to refuse or cancel any order for reasons including but not limited to:</p>
<ul>
<li>Product unavailability</li>
<li>Pricing or description errors</li>
<li>Suspected fraudulent activity</li>
<li>Delivery address outside our service area</li>
<li>Failure to meet minimum order requirements</li>
</ul>
<p><strong>Payment Methods:</strong> We accept payment via credit/debit cards processed through our secure payment partner, Paymob. Cash on Delivery (COD) and wallet balance are also available payment options.</p>
<p><strong>Payment Security:</strong> All card payments are processed through Paymob's PCI-DSS compliant infrastructure. We do not store your full card numbers on our servers. Only tokenized references are stored for saved cards.</p>
<p><strong>Wallet:</strong> You may maintain a CART wallet balance for quick checkout. Wallet funds are non-transferable and can be used only for purchases within the App.</p>

<h2>7. Delivery Policy</h2>
<ul>
<li>We strive to deliver orders within the estimated timeframe displayed at checkout.</li>
<li>Delivery times are estimates and may vary based on location, traffic conditions, weather, order volume, and other factors.</li>
<li>You must provide accurate delivery address information including building, floor, and apartment details.</li>
<li>Someone must be available at the delivery address to receive the order.</li>
<li>Delivery fees, if applicable, will be clearly displayed before order confirmation.</li>
<li>Free delivery promotions may be available for orders meeting the specified minimum amount.</li>
<li>We deliver only within our designated service areas as shown in the App.</li>
</ul>

<h2>8. Order Cancellation</h2>
<ul>
<li>You may cancel an order before it enters the "Processing" stage.</li>
<li>Once an order is being prepared or has been dispatched, cancellation may not be possible.</li>
<li>Refunds for cancelled orders will be processed to the original payment method within 5-14 business days, depending on your bank.</li>
<li>Partial cancellations (removing specific items) may be available depending on the order status.</li>
</ul>

<h2>9. Returns and Refunds</h2>
<ul>
<li>We accept returns for damaged, defective, or incorrect items.</li>
<li>You must report issues within 24 hours of delivery by contacting our customer support through the App.</li>
<li>Please provide photos of the damaged/incorrect items for faster processing.</li>
<li>Refunds will be issued to your original payment method or as CART wallet credit, at your preference.</li>
<li>Perishable goods (fresh produce, dairy, frozen items) cannot be returned unless they arrive in a damaged or spoiled condition.</li>
<li>Refund processing times: Wallet credit (instant), Card refunds (5-14 business days depending on your bank).</li>
</ul>

<h2>10. User-Generated Content</h2>
<p>By submitting reviews, ratings, or other content through the App, you:</p>
<ul>
<li>Grant CART a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content</li>
<li>Represent that your content is truthful and based on genuine experience</li>
<li>Agree not to post defamatory, offensive, or misleading content</li>
<li>Acknowledge that we may remove content that violates these Terms at our discretion</li>
</ul>

<h2>11. Intellectual Property</h2>
<p>All content, features, and functionality of the App, including but not limited to text, graphics, logos, icons, images, and software, are the exclusive property of CART and are protected by intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our prior written consent.</p>

<h2>12. Privacy</h2>
<p>Your privacy is important to us. Please review our <strong>Privacy Policy</strong> to understand how we collect, use, and protect your personal information. By using the App, you consent to our data practices as described in the Privacy Policy.</p>

<h2>13. Limitation of Liability</h2>
<p>To the maximum extent permitted by law:</p>
<ul>
<li>CART shall not be liable for any indirect, incidental, special, consequential, or punitive damages</li>
<li>CART shall not be liable for damages arising from third-party services (payment processing, mapping, etc.)</li>
<li>Our total liability shall not exceed the amount you paid for the specific order in question</li>
<li>We are not liable for delays or failures caused by circumstances beyond our reasonable control (force majeure)</li>
</ul>

<h2>14. Indemnification</h2>
<p>You agree to indemnify and hold harmless CART, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising from your use of the App, violation of these Terms, or infringement of any third-party rights.</p>

<h2>15. Account Termination</h2>
<ul>
<li>You may delete your account at any time through the App (Profile → Delete Account).</li>
<li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
<li>Upon termination, your right to use the App ceases immediately.</li>
<li>Provisions that by their nature should survive termination will remain in effect.</li>
</ul>

<h2>16. Modifications to Terms</h2>
<p>We reserve the right to modify these Terms at any time. When we make significant changes, we will notify you through the App or via email. Your continued use of the App after changes constitutes acceptance of the modified Terms.</p>

<h2>17. Governing Law</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the competent courts in Egypt.</p>

<h2>18. Contact Us</h2>
<p>For questions about these Terms and Conditions, please contact us:</p>
<ul>
<li><strong>Email:</strong> kareemhesham105@gmail.com</li>
<li><strong>In-App:</strong> Profile → Help & Support → Contact Support</li>
<li><strong>Developer:</strong> CART</li>
</ul>
`;

const FALLBACK_CONTENT_AR = `
<h1>الشروط والأحكام</h1>

<p><strong>تطبيق Cart يُدار بواسطة Al Baraka Market.</strong></p>

<h2>1. قبول الشروط</h2>
<p>بتنزيل أو تثبيت أو الوصول إلى أو استخدام تطبيق CART ("التطبيق")، فإنك تقبل وتوافق على الالتزام بهذه الشروط والأحكام ("الشروط"). إذا كنت لا توافق على أي جزء من هذه الشروط، يجب عليك عدم استخدام خدماتنا.</p>
<p>تشكل هذه الشروط اتفاقية ملزمة قانونيًا بينك ("المستخدم"، "أنت") وبين CART ("نحن"، "لنا").</p>

<h2>2. الأهلية</h2>
<p>لاستخدام خدماتنا، يجب عليك:</p>
<ul>
<li>أن تكون بعمر 18 عامًا على الأقل أو لديك موافقة أحد الوالدين/الوصي</li>
<li>أن تتمتع بالأهلية القانونية للدخول في اتفاقية ملزمة</li>
<li>أن تقيم ضمن مناطق خدمة التوصيل لدينا</li>
<li>أن تقدم معلومات دقيقة وصحيحة أثناء التسجيل</li>
</ul>

<h2>3. تسجيل الحساب والأمان</h2>
<p>للوصول إلى ميزات معينة، يجب عليك تسجيل حساب. أنت توافق على:</p>
<ul>
<li>تقديم معلومات تسجيل دقيقة وحالية وكاملة</li>
<li>الحفاظ على معلومات حسابك وتحديثها فورًا</li>
<li>الحفاظ على سرية وأمان بيانات اعتماد حسابك</li>
<li>إبلاغنا فورًا بأي وصول غير مصرح به لحسابك</li>
<li>تحمل المسؤولية الكاملة عن جميع الأنشطة التي تتم تحت حسابك</li>
<li>عدم مشاركة بيانات اعتماد حسابك مع أي طرف ثالث</li>
</ul>
<p>ندعم تسجيل الدخول عبر البريد الإلكتروني/كلمة المرور، وGoogle، وApple. باستخدام تسجيل الدخول الاجتماعي، فإنك تفوضنا بالوصول إلى اسمك وعنوان بريدك الإلكتروني من هؤلاء المزودين.</p>

<h2>4. استخدام الخدمة</h2>
<p>تمنحك CART ترخيصًا محدودًا وغير حصري وغير قابل للتحويل وقابل للإلغاء لاستخدام التطبيق لأغراض شخصية وغير تجارية. أنت توافق على عدم:</p>
<ul>
<li>استخدام التطبيق لأي غرض غير قانوني أو احتيالي</li>
<li>التدخل في ميزات أمان التطبيق أو تعطيلها أو البنية التحتية للخادم</li>
<li>محاولة الهندسة العكسية أو تفكيك أو تحليل التطبيق</li>
<li>استخدام روبوتات آلية أو أدوات مشابهة للوصول إلى التطبيق</li>
<li>التحايل على تحديد معدل الطلبات أو ضوابط الوصول أو إجراءات الأمان</li>
<li>انتحال شخصية أي شخص أو كيان أو تمثيل انتمائك بشكل زائف</li>
<li>تقديم تقييمات أو مراجعات أو شكاوى كاذبة</li>
<li>استخدام التطبيق للتحرش أو الإساءة أو إيذاء المستخدمين الآخرين أو موظفينا</li>
</ul>

<h2>5. المنتجات والأسعار</h2>
<ul>
<li>جميع المنتجات تخضع للتوفر. نحتفظ بالحق في إيقاف أي منتج في أي وقت.</li>
<li>الأسعار معروضة بالجنيه المصري وتشمل الضرائب المطبقة ما لم يُذكر خلاف ذلك.</li>
<li>نبذل قصارى جهدنا لعرض أسعار دقيقة. في حالة وجود خطأ في التسعير، نحتفظ بالحق في إلغاء الطلبات المقدمة بأسعار غير صحيحة.</li>
<li>العروض الترويجية والخصومات وأكواد القسائم تخضع لشروط محددة وتواريخ انتهاء وحدود استخدام كما هو مبين وقت العرض.</li>
<li>صور المنتجات لأغراض التوضيح. قد تختلف المنتجات الفعلية قليلاً في المظهر.</li>
<li>قد تختلف أوزان المنتجات قليلاً عن المبالغ المدرجة للمنتجات الطازجة والأطعمة الجاهزة.</li>
</ul>

<h2>6. الطلبات والمدفوعات</h2>
<p>جميع الطلبات تخضع لتوفر المنتجات وقبول CART. نحتفظ بالحق في رفض أو إلغاء أي طلب لأسباب تشمل على سبيل المثال لا الحصر:</p>
<ul>
<li>عدم توفر المنتج</li>
<li>أخطاء في التسعير أو الوصف</li>
<li>نشاط احتيالي مشتبه به</li>
<li>عنوان التوصيل خارج منطقة خدمتنا</li>
<li>عدم استيفاء الحد الأدنى لمتطلبات الطلب</li>
</ul>
<p><strong>طرق الدفع:</strong> نقبل الدفع عبر بطاقات الائتمان/الخصم المعالجة من خلال شريك الدفع الآمن Paymob. كما تتوفر خيارات الدفع عند الاستلام ورصيد المحفظة.</p>
<p><strong>أمان الدفع:</strong> تتم معالجة جميع مدفوعات البطاقات عبر بنية Paymob المتوافقة مع PCI-DSS. نحن لا نخزن أرقام البطاقات الكاملة على خوادمنا. يتم تخزين المراجع المرمزة فقط للبطاقات المحفوظة.</p>
<p><strong>المحفظة:</strong> يمكنك الاحتفاظ برصيد محفظة CART للدفع السريع. أموال المحفظة غير قابلة للتحويل ويمكن استخدامها فقط للمشتريات داخل التطبيق.</p>

<h2>7. سياسة التوصيل</h2>
<ul>
<li>نسعى لتوصيل الطلبات خلال الإطار الزمني المقدر المعروض عند الدفع.</li>
<li>أوقات التوصيل تقديرية وقد تختلف بناءً على الموقع وظروف المرور والطقس وحجم الطلبات وعوامل أخرى.</li>
<li>يجب تقديم معلومات دقيقة لعنوان التوصيل بما في ذلك المبنى والطابق وتفاصيل الشقة.</li>
<li>يجب أن يكون شخص متاحًا في عنوان التوصيل لاستلام الطلب.</li>
<li>سيتم عرض رسوم التوصيل، إن وجدت، بوضوح قبل تأكيد الطلب.</li>
<li>قد تتوفر عروض التوصيل المجاني للطلبات التي تستوفي الحد الأدنى المحدد.</li>
<li>نقوم بالتوصيل فقط ضمن مناطق الخدمة المحددة كما هو موضح في التطبيق.</li>
</ul>

<h2>8. إلغاء الطلب</h2>
<ul>
<li>يمكنك إلغاء الطلب قبل دخوله مرحلة "قيد المعالجة".</li>
<li>بمجرد أن يكون الطلب قيد التحضير أو تم إرساله، قد لا يكون الإلغاء ممكنًا.</li>
<li>سيتم معالجة استرداد الأموال للطلبات الملغاة إلى طريقة الدفع الأصلية خلال 5-14 يوم عمل، حسب البنك.</li>
<li>قد يكون الإلغاء الجزئي (إزالة عناصر محددة) متاحًا حسب حالة الطلب.</li>
</ul>

<h2>9. الإرجاع والاسترداد</h2>
<ul>
<li>نقبل إرجاع المنتجات التالفة أو المعيبة أو غير الصحيحة.</li>
<li>يجب الإبلاغ عن المشكلات خلال 24 ساعة من التوصيل عبر التواصل مع دعم العملاء من خلال التطبيق.</li>
<li>يرجى تقديم صور للمنتجات التالفة/غير الصحيحة لمعالجة أسرع.</li>
<li>سيتم إصدار المبالغ المستردة إلى طريقة الدفع الأصلية أو كرصيد محفظة CART، حسب تفضيلك.</li>
<li>لا يمكن إرجاع البضائع القابلة للتلف (المنتجات الطازجة، الألبان، المجمدات) إلا إذا وصلت في حالة تلف أو فساد.</li>
<li>أوقات معالجة الاسترداد: رصيد المحفظة (فوري)، استرداد البطاقة (5-14 يوم عمل حسب البنك).</li>
</ul>

<h2>10. المحتوى الذي ينشئه المستخدم</h2>
<p>بتقديم التقييمات أو المراجعات أو أي محتوى آخر عبر التطبيق، فإنك:</p>
<ul>
<li>تمنح CART ترخيصًا غير حصري وعالمي وبدون حقوق ملكية لاستخدام وعرض وتوزيع محتواك</li>
<li>تقر بأن محتواك صادق ويستند إلى تجربة حقيقية</li>
<li>توافق على عدم نشر محتوى تشهيري أو مسيء أو مضلل</li>
<li>تقر بأننا قد نزيل المحتوى الذي ينتهك هذه الشروط وفقًا لتقديرنا</li>
</ul>

<h2>11. الملكية الفكرية</h2>
<p>جميع المحتويات والميزات والوظائف في التطبيق، بما في ذلك على سبيل المثال لا الحصر النصوص والرسومات والشعارات والأيقونات والصور والبرمجيات، هي ملكية حصرية لـ CART ومحمية بموجب قوانين الملكية الفكرية. لا يجوز لك إعادة إنتاج أو توزيع أو تعديل أو إنشاء أعمال مشتقة دون موافقتنا الخطية المسبقة.</p>

<h2>12. الخصوصية</h2>
<p>خصوصيتك مهمة لنا. يرجى مراجعة <strong>سياسة الخصوصية</strong> الخاصة بنا لفهم كيفية جمع واستخدام وحماية معلوماتك الشخصية. باستخدام التطبيق، فإنك توافق على ممارسات البيانات لدينا كما هو موضح في سياسة الخصوصية.</p>

<h2>13. حدود المسؤولية</h2>
<p>إلى أقصى حد يسمح به القانون:</p>
<ul>
<li>لا تتحمل CART أي مسؤولية عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية</li>
<li>لا تتحمل CART أي مسؤولية عن الأضرار الناتجة عن خدمات الأطراف الثالثة (معالجة الدفع، الخرائط، إلخ)</li>
<li>لن تتجاوز مسؤوليتنا الإجمالية المبلغ الذي دفعته مقابل الطلب المحدد المعني</li>
<li>نحن غير مسؤولين عن التأخيرات أو الإخفاقات الناتجة عن ظروف خارجة عن سيطرتنا المعقولة (قوة قاهرة)</li>
</ul>

<h2>14. التعويض</h2>
<p>أنت توافق على تعويض وحماية CART ومسؤوليها ومديريها وموظفيها ووكلائها من أي مطالبات أو أضرار أو خسائر أو مسؤوليات ونفقات ناشئة عن استخدامك للتطبيق أو انتهاكك لهذه الشروط أو انتهاك حقوق أي طرف ثالث.</p>

<h2>15. إنهاء الحساب</h2>
<ul>
<li>يمكنك حذف حسابك في أي وقت من خلال التطبيق (الملف الشخصي → حذف الحساب).</li>
<li>نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط.</li>
<li>عند الإنهاء، يتوقف حقك في استخدام التطبيق فورًا.</li>
<li>تظل الأحكام التي بطبيعتها يجب أن تبقى بعد الإنهاء سارية المفعول.</li>
</ul>

<h2>16. التعديلات على الشروط</h2>
<p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. عندما نجري تغييرات جوهرية، سنقوم بإخطارك من خلال التطبيق أو عبر البريد الإلكتروني. يعتبر استمرارك في استخدام التطبيق بعد التغييرات قبولًا للشروط المعدلة.</p>

<h2>17. القانون الحاكم</h2>
<p>تخضع هذه الشروط وتُفسر وفقًا لقوانين جمهورية مصر العربية. أي نزاعات ناشئة عن هذه الشروط تخضع للاختصاص الحصري للمحاكم المختصة في مصر.</p>

<h2>18. اتصل بنا</h2>
<p>لأي استفسارات حول هذه الشروط والأحكام، يرجى التواصل معنا:</p>
<ul>
<li><strong>البريد الإلكتروني:</strong> kareemhesham105@gmail.com</li>
<li><strong>داخل التطبيق:</strong> الملف الشخصي → المساعدة والدعم → اتصل بالدعم</li>
<li><strong>المطور:</strong> CART</li>
</ul>
`;

export default function TermsScreen() {
  return (
    <StaticPageScreen
      slug="terms"
      fallbackTitle="Terms & Conditions"
      fallbackTitleAr="الشروط والأحكام"
      fallbackContent={FALLBACK_CONTENT}
      fallbackContentAr={FALLBACK_CONTENT_AR}
      icon={<FileText size={24} color={Colors.neutralWhite} />}
    />
  );
}
