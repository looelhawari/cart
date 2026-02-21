import React from "react";
import { FileText } from "lucide-react-native";
import Colors from "@/constants/Colors";
import StaticPageScreen from "@/components/StaticPageScreen";

// Fallback content in case API is unavailable
const FALLBACK_CONTENT = `
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

<h2>5. Delivery Policy</h2>
<p>We strive to deliver your orders within the estimated timeframe. However, delivery times may vary based on location, traffic, and other factors. Standard delivery is typically completed within 1-2 hours in our service area.</p>

<h2>6. Returns and Refunds</h2>
<p>We accept returns for damaged or incorrect items within 24 hours of delivery. To initiate a return, please contact our customer support team with your order details and photos of the issue.</p>

<h2>7. Privacy</h2>
<p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.</p>

<h2>8. Limitation of Liability</h2>
<p>CART shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.</p>

<h2>9. Changes to Terms</h2>
<p>We reserve the right to modify these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms. We will notify you of significant changes through the App or email.</p>

<h2>10. Contact Us</h2>
<p>For questions about these Terms and Conditions, please contact us at <strong>support@elbaraka.com</strong></p>
`;

const FALLBACK_CONTENT_AR = `
<h1>الشروط والأحكام</h1>

<h2>1. قبول الشروط</h2>
<p>باستخدامك لتطبيق CART ("التطبيق")، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام خدماتنا.</p>

<h2>2. استخدام الخدمة</h2>
<p>تمنحك CART ترخيصًا محدودًا وغير حصري وغير قابل للتحويل لاستخدام التطبيق لأغراض شخصية وغير تجارية. أنت توافق على استخدام التطبيق فقط لأغراض مشروعة ووفقًا لهذه الشروط.</p>

<h2>3. تسجيل الحساب</h2>
<p>للوصول إلى ميزات معينة، يجب عليك تسجيل حساب. أنت توافق على:</p>
<ul>
<li>تقديم معلومات تسجيل دقيقة وكاملة</li>
<li>الحفاظ على أمان بيانات اعتماد حسابك</li>
<li>إبلاغنا فورًا بأي وصول غير مصرح به</li>
<li>تحمل المسؤولية عن جميع الأنشطة تحت حسابك</li>
</ul>

<h2>4. الطلبات والمدفوعات</h2>
<p>جميع الطلبات تخضع لتوفر المنتجات والقبول. نحتفظ بالحق في رفض أو إلغاء أي طلب. يجب إتمام الدفع وقت تقديم الطلب من خلال نظام الدفع الآمن الخاص بنا.</p>

<h2>5. سياسة التوصيل</h2>
<p>نسعى لتوصيل طلباتكم خلال الإطار الزمني المقدر. ومع ذلك، قد تختلف أوقات التوصيل بناءً على الموقع وحركة المرور وعوامل أخرى. عادةً ما يتم التوصيل القياسي خلال ساعة إلى ساعتين في منطقة خدمتنا.</p>

<h2>6. الإرجاع والاسترداد</h2>
<p>نقبل إرجاع المنتجات التالفة أو غير الصحيحة خلال 24 ساعة من التوصيل. لبدء عملية الإرجاع، يرجى التواصل مع فريق دعم العملاء مع تفاصيل طلبك وصور للمشكلة.</p>

<h2>7. الخصوصية</h2>
<p>خصوصيتك مهمة لنا. يرجى مراجعة سياسة الخصوصية الخاصة بنا لفهم كيفية جمع واستخدام وحماية معلوماتك الشخصية.</p>

<h2>8. حدود المسؤولية</h2>
<p>لا تتحمل CART أي مسؤولية عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية ناتجة عن استخدامك أو عدم قدرتك على استخدام الخدمة.</p>

<h2>9. التغييرات على الشروط</h2>
<p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. يعتبر استمرار استخدامك للتطبيق بعد التغييرات قبولًا للشروط الجديدة. سنقوم بإخطارك بالتغييرات المهمة من خلال التطبيق أو البريد الإلكتروني.</p>

<h2>10. اتصل بنا</h2>
<p>لأي استفسارات حول هذه الشروط والأحكام، يرجى التواصل معنا على <strong>support@elbaraka.com</strong></p>
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
