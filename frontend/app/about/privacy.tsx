import React from "react";
import { Shield } from "lucide-react-native";
import Colors from "@/constants/Colors";
import StaticPageScreen from "@/components/StaticPageScreen";

// Fallback content matching cartshop.site/privacy-policy
const FALLBACK_CONTENT = `
<h1>Privacy Policy</h1>

<h2>1. Introduction</h2>
<p>Welcome to <strong>CART</strong>. We are committed to protecting your privacy and safeguarding the personal information you share with us.</p>
<p>This Privacy Policy explains how we collect, use, store, share, and protect your personal data when you use our mobile application ("CART").</p>
<p>By using our Services, you agree to the collection and use of information in accordance with this policy. If you do not agree with this policy, please do not use our Services.</p>

<h2>2. Information We Collect</h2>

<h3>2.1 Information You Provide Directly</h3>
<ul>
<li><strong>Account Information:</strong> Name, email address, phone number, date of birth, gender, and password when you create an account.</li>
<li><strong>Delivery Addresses:</strong> Street address, city, area, building/apartment details, and geographic coordinates (latitude/longitude) for delivery purposes.</li>
<li><strong>Payment Information:</strong> We do not directly store your credit/debit card numbers. Payment processing is handled by our third-party payment processor, Paymob. We store only tokenized card references (last 4 digits, card brand, expiry) for your convenience in managing saved payment methods.</li>
<li><strong>Order Information:</strong> Products ordered, quantities, delivery preferences, and special instructions.</li>
<li><strong>Communication Data:</strong> Messages, complaints, support tickets, reviews, and ratings you submit through the App.</li>
<li><strong>Preferences:</strong> Language preference, notification settings, and app preferences.</li>
</ul>

<h3>2.2 Information Collected Automatically</h3>
<ul>
<li><strong>Device Information:</strong> Device type, operating system version, unique device identifiers, and push notification tokens.</li>
<li><strong>Usage Data:</strong> App interactions, pages viewed, search queries, and feature usage patterns.</li>
<li><strong>Location Data:</strong> With your permission, we collect precise location data to provide delivery services, show nearby delivery zones, and enable address selection via map. For drivers, location is collected in the background to enable real-time delivery tracking.</li>
<li><strong>Log Data:</strong> IP address, browser type, access times, and referring URLs for security and analytics purposes.</li>
<li><strong>Network Information:</strong> Connection type (Wi-Fi, cellular) for optimizing app performance.</li>
</ul>

<h3>2.3 Information from Third Parties</h3>
<ul>
<li><strong>Social Login:</strong> If you sign in using Google or Apple, we receive your name and email address from those providers. We do not receive or store your social media passwords.</li>
<li><strong>Payment Provider:</strong> Paymob provides us with transaction status, tokenized card data, and payment confirmation details.</li>
</ul>

<h2>3. How We Use Your Information</h2>
<p>We use the information we collect for the following purposes:</p>
<ul>
<li>Account creation and authentication</li>
<li>Processing and delivering orders</li>
<li>Real-time delivery tracking</li>
<li>Customer support and complaint resolution</li>
<li>Push notifications (order updates, promotions)</li>
<li>Personalization and recommendations</li>
<li>Security and fraud prevention</li>
<li>Service improvement and analytics</li>
<li>Legal compliance</li>
</ul>

<h2>4. Data Storage and Security</h2>

<h3>4.1 Data Encryption</h3>
<p><strong>All data transmitted between your device and our servers is encrypted using TLS/SSL (HTTPS).</strong> Sensitive data at rest is encrypted using industry-standard encryption. Passwords are hashed using bcrypt and are never stored in plain text.</p>

<h3>4.2 Security Measures</h3>
<ul>
<li>HTTPS/TLS encryption for all data in transit</li>
<li>Bcrypt password hashing (never stored in plain text)</li>
<li>Token-based authentication (Laravel Sanctum) with automatic expiry</li>
<li>HMAC SHA-512 verification on all payment webhooks</li>
<li>Rate limiting to prevent brute-force and abuse attacks</li>
<li>IP-based security monitoring and blacklisting</li>
<li>Security headers (CSP, HSTS, X-Frame-Options, X-XSS-Protection)</li>
<li>Input validation and sanitization on all endpoints</li>
<li>Admin activity audit logging for accountability</li>
<li>Role-based access control (RBAC) for internal access</li>
</ul>

<h3>4.3 Data Retention</h3>
<ul>
<li><strong>Account data:</strong> Retained while your account is active. Deleted upon account deletion request.</li>
<li><strong>Order history:</strong> Retained for 3 years for legal and financial compliance, then anonymized.</li>
<li><strong>Payment tokens:</strong> Retained until you remove the saved card or delete your account.</li>
<li><strong>Support tickets:</strong> Retained for 2 years after resolution.</li>
<li><strong>Activity logs:</strong> Retained for 1 year for security purposes.</li>
<li><strong>Analytics data:</strong> Aggregated and anonymized after 1 year.</li>
</ul>

<h2>5. Data Sharing and Disclosure</h2>
<p>We do <strong>not sell</strong> your personal information to third parties. We may share your data only in the following circumstances:</p>

<h3>5.1 Service Providers</h3>
<ul>
<li><strong>Paymob</strong> — Payment processing (card transactions, refunds)</li>
<li><strong>Cloudinary</strong> — Image storage and delivery (product images, avatars)</li>
<li><strong>Expo / Google FCM</strong> — Push notification delivery</li>
<li><strong>Pusher</strong> — Real-time communication (order tracking, chat)</li>
<li><strong>Nominatim/OpenStreetMap</strong> — Geocoding and map services</li>
</ul>

<h3>5.2 Delivery Drivers</h3>
<p>When you place an order, your delivery address and name are shared with the assigned driver to complete the delivery. Drivers cannot see your full account details.</p>

<h3>5.3 Legal Requirements</h3>
<p>We may disclose your information if required by law, court order, or governmental regulation, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</p>

<h2>6. Your Rights</h2>
<p>You have the following rights regarding your personal data:</p>
<ul>
<li><strong>Access:</strong> View your personal data through your App profile at any time.</li>
<li><strong>Correction:</strong> Update your name, phone number, email, date of birth, and avatar through the App.</li>
<li><strong>Deletion:</strong> Request complete deletion of your account and associated data.</li>
<li><strong>Data Portability:</strong> Request a copy of your data by contacting our support team.</li>
<li><strong>Notification Control:</strong> Manage notification preferences granularly within the App settings. You can opt out of marketing notifications at any time.</li>
<li><strong>Withdraw Consent:</strong> Revoke location permissions or other consents through your device settings at any time.</li>
</ul>

<h2>7. Cookies and Local Storage</h2>
<p>As a mobile application, CART does not use browser cookies. However, we use the following local storage mechanisms:</p>
<ul>
<li><strong>AsyncStorage:</strong> To persist your preferences, language settings, cached data, and session information locally on your device.</li>
<li><strong>SecureStore:</strong> To securely store authentication tokens and biometric credentials using your device's secure enclave.</li>
<li><strong>File System Cache:</strong> To cache product images locally for faster loading (automatically cleared after 7 days).</li>
</ul>

<h2>8. Account Deletion</h2>
<p>You can request the deletion of your account and all associated personal data at any time through the App under <strong>Profile → Settings</strong>.</p>
<p>Upon submitting a deletion request:</p>
<ul>
<li>Your account will be deactivated immediately.</li>
<li>All personal data (profile, addresses, favorites, notification preferences, saved payment methods) will be permanently deleted within <strong>7 days</strong>.</li>
<li>Order history will be anonymized (personal identifiers removed) but retained for legal and financial compliance for up to 3 years.</li>
<li>Active orders, if any, will be completed before the account is fully deleted.</li>
<li>Wallet balance refunds, if applicable, will be processed before deletion.</li>
</ul>
<p>This action is <strong>irreversible</strong>. Once your data is deleted, it cannot be recovered.</p>

<h2>9. Biometric Data</h2>
<p>If you enable biometric login (fingerprint), your biometric data is processed entirely on your device by the operating system. <strong>We never receive, transmit, or store your actual biometric data.</strong> We only store a flag indicating that biometric login is enabled, and encrypted credentials in your device's secure enclave.</p>

<h2>10. Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. When we make significant changes, we will notify you through the App or via email. The "Last Updated" date at the top of this page indicates when the policy was last revised.</p>
<p>Your continued use of the Services after any changes constitutes acceptance of the updated policy.</p>

<h2>11. Contact Us</h2>
<p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
<ul>
<li><strong>Email:</strong> kareemhesham105@gmail.com</li>
<li><strong>In-App:</strong> Profile → Help & Support → Contact Support</li>
<li><strong>Developer:</strong> CART</li>
</ul>
`;

const FALLBACK_CONTENT_AR = `
<h1>سياسة الخصوصية</h1>

<h2>1. المقدمة</h2>
<p>مرحبًا بكم في <strong>CART</strong>. نحن ملتزمون بحماية خصوصيتك وحماية المعلومات الشخصية التي تشاركها معنا.</p>
<p>توضح سياسة الخصوصية هذه كيفية جمع واستخدام وتخزين ومشاركة وحماية بياناتك الشخصية عند استخدام تطبيقنا ("CART").</p>
<p>باستخدامك لخدماتنا، فإنك توافق على جمع واستخدام المعلومات وفقًا لهذه السياسة. إذا كنت لا توافق على هذه السياسة، يرجى عدم استخدام خدماتنا.</p>

<h2>2. المعلومات التي نجمعها</h2>

<h3>2.1 المعلومات التي تقدمها مباشرة</h3>
<ul>
<li><strong>معلومات الحساب:</strong> الاسم، البريد الإلكتروني، رقم الهاتف، تاريخ الميلاد، الجنس، وكلمة المرور عند إنشاء حساب.</li>
<li><strong>عناوين التوصيل:</strong> عنوان الشارع، المدينة، المنطقة، تفاصيل المبنى/الشقة، والإحداثيات الجغرافية لأغراض التوصيل.</li>
<li><strong>معلومات الدفع:</strong> نحن لا نخزن أرقام بطاقات الائتمان/الخصم مباشرة. تتم معالجة الدفع عبر معالج الدفع الخارجي Paymob. نخزن فقط مراجع البطاقات المرمزة (آخر 4 أرقام، نوع البطاقة، تاريخ الانتهاء) لراحتك في إدارة طرق الدفع المحفوظة.</li>
<li><strong>معلومات الطلب:</strong> المنتجات المطلوبة، الكميات، تفضيلات التوصيل، والتعليمات الخاصة.</li>
<li><strong>بيانات التواصل:</strong> الرسائل، الشكاوى، تذاكر الدعم، التقييمات والمراجعات التي تقدمها عبر التطبيق.</li>
<li><strong>التفضيلات:</strong> تفضيل اللغة، إعدادات الإشعارات، وتفضيلات التطبيق.</li>
</ul>

<h3>2.2 المعلومات المجمعة تلقائيًا</h3>
<ul>
<li><strong>معلومات الجهاز:</strong> نوع الجهاز، إصدار نظام التشغيل، المعرفات الفريدة للجهاز، ورموز الإشعارات.</li>
<li><strong>بيانات الاستخدام:</strong> تفاعلات التطبيق، الصفحات المعروضة، استعلامات البحث، وأنماط استخدام الميزات.</li>
<li><strong>بيانات الموقع:</strong> بإذنك، نجمع بيانات الموقع الدقيقة لتوفير خدمات التوصيل وعرض مناطق التوصيل القريبة وتمكين اختيار العنوان عبر الخريطة. بالنسبة للسائقين، يتم جمع الموقع في الخلفية لتمكين تتبع التوصيل في الوقت الفعلي.</li>
<li><strong>بيانات السجل:</strong> عنوان IP، نوع المتصفح، أوقات الوصول، وعناوين URL المرجعية لأغراض الأمان والتحليلات.</li>
<li><strong>معلومات الشبكة:</strong> نوع الاتصال (Wi-Fi، شبكة خلوية) لتحسين أداء التطبيق.</li>
</ul>

<h3>2.3 المعلومات من أطراف ثالثة</h3>
<ul>
<li><strong>تسجيل الدخول الاجتماعي:</strong> إذا قمت بتسجيل الدخول باستخدام Google أو Apple، نتلقى اسمك وعنوان بريدك الإلكتروني من هؤلاء المزودين. نحن لا نتلقى أو نخزن كلمات مرور وسائل التواصل الاجتماعي الخاصة بك.</li>
<li><strong>مزود الدفع:</strong> يوفر لنا Paymob حالة المعاملة وبيانات البطاقة المرمزة وتفاصيل تأكيد الدفع.</li>
</ul>

<h2>3. كيف نستخدم معلوماتك</h2>
<p>نستخدم المعلومات التي نجمعها للأغراض التالية:</p>
<ul>
<li>إنشاء الحساب والمصادقة</li>
<li>معالجة وتوصيل الطلبات</li>
<li>تتبع التوصيل في الوقت الفعلي</li>
<li>دعم العملاء وحل الشكاوى</li>
<li>الإشعارات (تحديثات الطلبات، العروض الترويجية)</li>
<li>التخصيص والتوصيات</li>
<li>الأمان ومنع الاحتيال</li>
<li>تحسين الخدمة والتحليلات</li>
<li>الامتثال القانوني</li>
</ul>

<h2>4. تخزين البيانات والأمان</h2>

<h3>4.1 تشفير البيانات</h3>
<p><strong>جميع البيانات المنقولة بين جهازك وخوادمنا مشفرة باستخدام TLS/SSL (HTTPS).</strong> البيانات الحساسة المخزنة مشفرة باستخدام تشفير معياري. كلمات المرور مشفرة باستخدام bcrypt ولا يتم تخزينها أبدًا كنص عادي.</p>

<h3>4.2 إجراءات الأمان</h3>
<ul>
<li>تشفير HTTPS/TLS لجميع البيانات أثناء النقل</li>
<li>تشفير كلمات المرور بـ bcrypt (لا يتم تخزينها كنص عادي أبدًا)</li>
<li>مصادقة قائمة على الرموز (Laravel Sanctum) مع انتهاء صلاحية تلقائي</li>
<li>التحقق من HMAC SHA-512 على جميع إشعارات الدفع</li>
<li>تحديد معدل الطلبات لمنع هجمات القوة الغاشمة</li>
<li>مراقبة أمنية قائمة على IP وقائمة سوداء</li>
<li>رؤوس أمان (CSP, HSTS, X-Frame-Options, X-XSS-Protection)</li>
<li>التحقق من صحة المدخلات وتعقيمها في جميع النقاط</li>
<li>تسجيل نشاط المسؤول للمساءلة</li>
<li>التحكم في الوصول القائم على الأدوار (RBAC)</li>
</ul>

<h3>4.3 الاحتفاظ بالبيانات</h3>
<ul>
<li><strong>بيانات الحساب:</strong> يتم الاحتفاظ بها أثناء نشاط حسابك. تُحذف عند طلب حذف الحساب.</li>
<li><strong>سجل الطلبات:</strong> يتم الاحتفاظ به لمدة 3 سنوات للامتثال القانوني والمالي، ثم يتم إخفاء الهوية.</li>
<li><strong>رموز الدفع:</strong> يتم الاحتفاظ بها حتى تقوم بإزالة البطاقة المحفوظة أو حذف حسابك.</li>
<li><strong>تذاكر الدعم:</strong> يتم الاحتفاظ بها لمدة سنتين بعد الحل.</li>
<li><strong>سجلات النشاط:</strong> يتم الاحتفاظ بها لمدة سنة واحدة لأغراض أمنية.</li>
<li><strong>بيانات التحليلات:</strong> يتم تجميعها وإخفاء هويتها بعد سنة واحدة.</li>
</ul>

<h2>5. مشاركة البيانات والإفصاح</h2>
<p>نحن <strong>لا نبيع</strong> معلوماتك الشخصية لأطراف ثالثة. قد نشارك بياناتك فقط في الظروف التالية:</p>

<h3>5.1 مزودو الخدمات</h3>
<ul>
<li><strong>Paymob</strong> — معالجة الدفع (معاملات البطاقات، المبالغ المستردة)</li>
<li><strong>Cloudinary</strong> — تخزين وتوصيل الصور (صور المنتجات، الصور الشخصية)</li>
<li><strong>Expo / Google FCM</strong> — توصيل الإشعارات</li>
<li><strong>Pusher</strong> — الاتصال في الوقت الفعلي (تتبع الطلبات، المحادثات)</li>
<li><strong>Nominatim/OpenStreetMap</strong> — خدمات الترميز الجغرافي والخرائط</li>
</ul>

<h3>5.2 سائقو التوصيل</h3>
<p>عند تقديم طلب، تتم مشاركة عنوان التوصيل واسمك مع السائق المعين لإتمام التوصيل. لا يمكن للسائقين رؤية تفاصيل حسابك الكاملة.</p>

<h3>5.3 المتطلبات القانونية</h3>
<p>قد نكشف عن معلوماتك إذا كان ذلك مطلوبًا بموجب القانون أو أمر المحكمة أو اللوائح الحكومية، أو إذا كنا نعتقد أن الكشف ضروري لحماية حقوقنا أو سلامتك أو سلامة الآخرين.</p>

<h2>6. حقوقك</h2>
<p>لديك الحقوق التالية فيما يتعلق ببياناتك الشخصية:</p>
<ul>
<li><strong>الوصول:</strong> عرض بياناتك الشخصية من خلال ملفك الشخصي في التطبيق في أي وقت.</li>
<li><strong>التصحيح:</strong> تحديث اسمك ورقم هاتفك وبريدك الإلكتروني وتاريخ ميلادك وصورتك الشخصية من خلال التطبيق.</li>
<li><strong>الحذف:</strong> طلب حذف كامل لحسابك والبيانات المرتبطة به.</li>
<li><strong>نقل البيانات:</strong> طلب نسخة من بياناتك عبر التواصل مع فريق الدعم.</li>
<li><strong>التحكم في الإشعارات:</strong> إدارة تفضيلات الإشعارات بدقة ضمن إعدادات التطبيق. يمكنك إلغاء الاشتراك في إشعارات التسويق في أي وقت.</li>
<li><strong>سحب الموافقة:</strong> إلغاء أذونات الموقع أو الموافقات الأخرى من خلال إعدادات جهازك في أي وقت.</li>
</ul>

<h2>7. ملفات تعريف الارتباط والتخزين المحلي</h2>
<p>بصفته تطبيق هاتف محمول، لا يستخدم CART ملفات تعريف الارتباط في المتصفح. ومع ذلك، نستخدم آليات التخزين المحلي التالية:</p>
<ul>
<li><strong>AsyncStorage:</strong> لحفظ تفضيلاتك وإعدادات اللغة والبيانات المخزنة مؤقتًا ومعلومات الجلسة محليًا على جهازك.</li>
<li><strong>SecureStore:</strong> لتخزين رموز المصادقة وبيانات اعتماد القياسات الحيوية بأمان باستخدام المنطقة الآمنة في جهازك.</li>
<li><strong>ذاكرة التخزين المؤقت للملفات:</strong> لتخزين صور المنتجات مؤقتًا محليًا لتحميل أسرع (يتم مسحها تلقائيًا بعد 7 أيام).</li>
</ul>

<h2>8. حذف الحساب</h2>
<p>يمكنك طلب حذف حسابك وجميع البيانات الشخصية المرتبطة به في أي وقت من خلال التطبيق عبر <strong>الملف الشخصي → الإعدادات</strong>.</p>
<p>عند تقديم طلب الحذف:</p>
<ul>
<li>سيتم إلغاء تنشيط حسابك فورًا.</li>
<li>سيتم حذف جميع البيانات الشخصية (الملف الشخصي، العناوين، المفضلات، تفضيلات الإشعارات، طرق الدفع المحفوظة) نهائيًا خلال <strong>7 أيام</strong>.</li>
<li>سيتم إخفاء هوية سجل الطلبات (إزالة المعرفات الشخصية) مع الاحتفاظ به للامتثال القانوني والمالي لمدة تصل إلى 3 سنوات.</li>
<li>سيتم إكمال الطلبات النشطة، إن وجدت، قبل حذف الحساب بالكامل.</li>
<li>سيتم معالجة استرداد رصيد المحفظة، إن وجد، قبل الحذف.</li>
</ul>
<p>هذا الإجراء <strong>لا رجعة فيه</strong>. بمجرد حذف بياناتك، لا يمكن استعادتها.</p>

<h2>9. البيانات البيومترية</h2>
<p>إذا قمت بتمكين تسجيل الدخول البيومتري (بصمة الإصبع)، تتم معالجة بياناتك البيومترية بالكامل على جهازك بواسطة نظام التشغيل. <strong>نحن لا نتلقى أو ننقل أو نخزن بياناتك البيومترية الفعلية أبدًا.</strong> نخزن فقط علامة تشير إلى تمكين تسجيل الدخول البيومتري، وبيانات اعتماد مشفرة في المنطقة الآمنة لجهازك.</p>

<h2>10. التغييرات على هذه السياسة</h2>
<p>قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. عندما نجري تغييرات جوهرية، سنقوم بإخطارك من خلال التطبيق أو عبر البريد الإلكتروني. يشير تاريخ "آخر تحديث" في أعلى هذه الصفحة إلى آخر مرة تم فيها مراجعة السياسة.</p>
<p>يعتبر استمرارك في استخدام الخدمات بعد أي تغييرات قبولًا للسياسة المحدثة.</p>

<h2>11. اتصل بنا</h2>
<p>إذا كان لديك أي أسئلة أو مخاوف أو طلبات بخصوص سياسة الخصوصية هذه أو ممارسات البيانات لدينا، يرجى التواصل معنا:</p>
<ul>
<li><strong>البريد الإلكتروني:</strong> kareemhesham105@gmail.com</li>
<li><strong>داخل التطبيق:</strong> الملف الشخصي → المساعدة والدعم → اتصل بالدعم</li>
<li><strong>المطور:</strong> CART</li>
</ul>
`;

export default function PrivacyScreen() {
  return (
    <StaticPageScreen
      slug="privacy"
      fallbackTitle="Privacy Policy"
      fallbackTitleAr="سياسة الخصوصية"
      fallbackContent={FALLBACK_CONTENT}
      fallbackContentAr={FALLBACK_CONTENT_AR}
      icon={<Shield size={24} color={Colors.neutralWhite} />}
    />
  );
}
