import React from "react";
import { Shield } from "lucide-react-native";
import Colors from "@/constants/Colors";
import StaticPageScreen from "@/components/StaticPageScreen";

// Fallback content in case API is unavailable
const FALLBACK_CONTENT = `
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
</ul>

<h2>6. Cookies and Tracking</h2>
<p>We use cookies and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content. You can manage cookie preferences in your device settings.</p>

<h2>7. Children's Privacy</h2>
<p>Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected such information, please contact us immediately.</p>

<h2>8. Data Retention</h2>
<p>We retain your personal information only for as long as necessary to provide our services and fulfill legal obligations. You can request deletion of your data at any time.</p>

<h2>9. Changes to This Policy</h2>
<p>We may update this Privacy Policy periodically. We will notify you of significant changes through the app or via email. Continued use of the service after changes constitutes acceptance.</p>

<h2>10. Contact Us</h2>
<p>For questions, concerns, or requests regarding your privacy, please contact us:</p>
<p><strong>Email:</strong> privacy@elbaraka.com</p>
<p><strong>Phone:</strong> +20 123 456 789</p>
`;

const FALLBACK_CONTENT_AR = `
<h1>سياسة الخصوصية</h1>

<h2>خصوصيتك تهمنا</h2>
<p>في CART، نحن ملتزمون بحماية خصوصيتك وضمان أمان معلوماتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام والإفصاح عن بياناتك وحمايتها عند استخدام تطبيقنا.</p>

<h2>1. المعلومات التي نجمعها</h2>
<p>نجمع المعلومات التي تقدمها لنا مباشرة، بما في ذلك:</p>
<ul>
<li><strong>المعلومات الشخصية:</strong> الاسم، البريد الإلكتروني، رقم الهاتف</li>
<li><strong>معلومات التوصيل:</strong> العنوان، بيانات الموقع، تعليمات التوصيل</li>
<li><strong>معلومات الدفع:</strong> تفاصيل البطاقة (تتم معالجتها بأمان عبر مزود الدفع)</li>
<li><strong>سجل الطلبات:</strong> طلباتك السابقة وتفضيلاتك</li>
<li><strong>معلومات الجهاز:</strong> نوع الجهاز، نظام التشغيل، المعرفات الفريدة</li>
</ul>

<h2>2. كيف نستخدم معلوماتك</h2>
<p>نستخدم المعلومات المجمعة للأغراض التالية:</p>
<ul>
<li>معالجة وتنفيذ طلباتك</li>
<li>تقديم دعم العملاء والرد على الاستفسارات</li>
<li>إرسال تأكيدات الطلبات وتحديثات التوصيل</li>
<li>تحسين خدماتنا وتجربة المستخدم</li>
<li>تخصيص تجربتك في التطبيق</li>
<li>إرسال العروض الترويجية (بموافقتك)</li>
</ul>

<h2>3. مشاركة المعلومات</h2>
<p>لا نبيع أو نتاجر أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك مع:</p>
<ul>
<li><strong>شركاء التوصيل:</strong> لتنفيذ طلباتك</li>
<li><strong>معالجي الدفع:</strong> لمعالجة المعاملات بأمان</li>
<li><strong>مزودي الخدمات:</strong> الذين يساعدون في تشغيل منصتنا</li>
<li><strong>السلطات القانونية:</strong> عند الاقتضاء بموجب القانون</li>
</ul>

<h2>4. أمان البيانات</h2>
<p>نطبق إجراءات أمان معيارية لحماية معلوماتك الشخصية، بما في ذلك:</p>
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
<li><strong>إلغاء الاشتراك:</strong> إلغاء الاشتراك في الرسائل التسويقية</li>
</ul>

<h2>6. ملفات تعريف الارتباط والتتبع</h2>
<p>نستخدم ملفات تعريف الارتباط وتقنيات مماثلة لتحسين تجربتك وتحليل أنماط الاستخدام وتقديم محتوى مخصص. يمكنك إدارة تفضيلات ملفات تعريف الارتباط في إعدادات جهازك.</p>

<h2>7. خصوصية الأطفال</h2>
<p>خدماتنا غير مخصصة للأطفال دون سن 13 عامًا. نحن لا نجمع معلومات شخصية من الأطفال عن علم. إذا كنت تعتقد أننا جمعنا مثل هذه المعلومات، يرجى الاتصال بنا فورًا.</p>

<h2>8. الاحتفاظ بالبيانات</h2>
<p>نحتفظ بمعلوماتك الشخصية فقط طالما كان ذلك ضروريًا لتقديم خدماتنا والوفاء بالتزاماتنا القانونية. يمكنك طلب حذف بياناتك في أي وقت.</p>

<h2>9. التغييرات على هذه السياسة</h2>
<p>قد نقوم بتحديث سياسة الخصوصية هذه بشكل دوري. سنقوم بإخطارك بالتغييرات المهمة من خلال التطبيق أو عبر البريد الإلكتروني. يعتبر استمرار استخدامك للخدمة بعد التغييرات قبولًا.</p>

<h2>10. اتصل بنا</h2>
<p>لأي أسئلة أو مخاوف أو طلبات بخصوص خصوصيتك، يرجى التواصل معنا:</p>
<p><strong>البريد الإلكتروني:</strong> privacy@elbaraka.com</p>
<p><strong>الهاتف:</strong> 789 456 123 20+</p>
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
