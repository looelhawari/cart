import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  Eye,
  EyeOff,
  Lock as LockIcon,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useStore } from "@/store";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useI18n } from "@/i18n";
import { API_CONFIG } from "@/config/app.config";

type Step = 1 | 2 | 3 | 4;
type Gender = "male" | "female" | "other";
type AddressLabel = "Home" | "Work" | "Other";

type SignupAddress = {
  label: AddressLabel;
  street: string;
  city: string;
  building?: string;
  floor?: string;
  apartment?: string;
  area?: string;
  landmark?: string;
  is_default: true;
};

type AddressErrors = {
  street?: string;
  city?: string;
};

type PhoneValidationResult = {
  normalized: string | null;
  error: string | null;
};

const normalizeEgyptianMobile = (
  value: string,
  invalidMessage: string,
): PhoneValidationResult => {
  const raw = value.trim();

  if (!raw || /\p{L}/u.test(raw)) {
    return { normalized: null, error: invalidMessage };
  }

  const compact = raw
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/\[/g, "")
    .replace(/\]/g, "")
    .replace(/\./g, "");

  if (!/^\+?\d+$/.test(compact)) {
    return { normalized: null, error: invalidMessage };
  }

  if ((compact.match(/\+/g) || []).length > 1 || (compact.includes("+") && !compact.startsWith("+"))) {
    return { normalized: null, error: invalidMessage };
  }

  const digits = compact.replace(/^\+/, "");
  let local = digits;

  if (digits.startsWith("20")) {
    local = digits.slice(2);
  } else if (digits.startsWith("0")) {
    local = digits.slice(1);
  }

  if (!/^(10|11|12|15)\d{8}$/.test(local)) {
    return { normalized: null, error: invalidMessage };
  }

  const subscriberDigits = local.slice(2).split("");
  if (new Set(subscriberDigits).size === 1) {
    return { normalized: null, error: invalidMessage };
  }

  return { normalized: `+20${local}`, error: null };
};

const sanitizeEgyptianMobileInput = (value: string, fallback = "") => {
  const digits = value.replace(/\D/g, "");
  let local = digits;

  if (local.startsWith("20")) {
    local = local.slice(2);
  }

  if (local.startsWith("0")) {
    local = local.slice(1);
  }

  if (local.length >= 1 && local[0] !== "1") {
    return fallback;
  }

  if (local.length >= 2 && !["0", "1", "2", "5"].includes(local[1])) {
    return fallback;
  }

  return local.slice(0, 10);
};

const splitFullName = (fullName: string) => {
  const [firstName = "", lastName = ""] = fullName.trim().replace(/\s+/g, " ").split(/\s+(.+)/);

  return {
    firstName,
    lastName,
  };
};

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const compactOptionalAddressFields = (address: SignupAddress): SignupAddress => {
  const cleaned = { ...address };

  (["building", "floor", "apartment", "area", "landmark"] as const).forEach(
    (key) => {
      if (!cleaned[key]?.trim()) {
        delete cleaned[key];
      }
    },
  );

  return cleaned;
};

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const register = useStore((state) => state.register);
  const { t, language, setLanguage: setAppLanguage } = useI18n();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState((params.email as string) || "");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [addressEnabled, setAddressEnabled] = useState(false);
  const [addressLabel, setAddressLabel] = useState<AddressLabel>("Home");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressArea, setAddressArea] = useState("");
  const [addressBuilding, setAddressBuilding] = useState("");
  const [addressFloor, setAddressFloor] = useState("");
  const [addressApartment, setAddressApartment] = useState("");
  const [addressLandmark, setAddressLandmark] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fullNameError, setFullNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [dateOfBirthError, setDateOfBirthError] = useState("");
  const [genderError, setGenderError] = useState("");
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [passwordError, setPasswordError] = useState("");

  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const clearServerErrors = () => {
    setEmailError("");
    setPhoneError("");
    setDateOfBirthError("");
    setGenderError("");
    setAddressErrors({});
    setPasswordError("");
  };

  const validateFullName = () => {
    const trimmed = fullName.trim().replace(/\s+/g, " ");

    if (!trimmed) return t.signup.enterFullName;
    if (trimmed.length < 2) return t.signup.fullNameTooShort;
    if (trimmed.length > 120) return t.signup.fullNameTooLong;

    return "";
  };

  const validateEmail = () => {
    const trimmed = email.trim();

    if (!trimmed) return t.signup.enterEmail;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return t.signup.invalidEmail;
    }

    return "";
  };

  const validatePhone = () => {
    if (!phone.trim()) return t.signup.enterPhone;

    return normalizeEgyptianMobile(phone, t.signup.invalidEgyptPhone).error ?? "";
  };

  const validateDateOfBirth = () => {
    if (!dateOfBirth) return t.signup.selectDateOfBirth;
    if (dateOfBirth >= new Date()) return t.signup.invalidDateOfBirth;
    if (dateOfBirth < new Date(1900, 0, 1)) return t.signup.invalidDateOfBirth;

    return "";
  };

  const validateGender = () => {
    if (!gender) return t.signup.selectGender;

    return "";
  };

  const validateStep1 = () => {
    const nextFullNameError = validateFullName();
    const nextEmailError = validateEmail();
    const nextPhoneError = validatePhone();
    const nextDateOfBirthError = validateDateOfBirth();
    const nextGenderError = validateGender();

    setFullNameError(nextFullNameError);
    setEmailError(nextEmailError);
    setPhoneError(nextPhoneError);
    setDateOfBirthError(nextDateOfBirthError);
    setGenderError(nextGenderError);

    return (
      !nextFullNameError &&
      !nextEmailError &&
      !nextPhoneError &&
      !nextDateOfBirthError &&
      !nextGenderError
    );
  };

  const validateStep2 = () => {
    if (!addressEnabled) {
      setAddressErrors({});
      return true;
    }

    const nextAddressErrors: AddressErrors = {};

    if (!addressStreet.trim()) {
      nextAddressErrors.street = t.signup.enterStreetAddress;
    }

    if (!addressCity.trim()) {
      nextAddressErrors.city = t.signup.enterCity;
    }

    setAddressErrors(nextAddressErrors);

    return Object.keys(nextAddressErrors).length === 0;
  };

  const validateStep3 = () => {
    if (!password.trim()) return t.signup.enterPassword;
    if (password.length < 8) return t.signup.passwordMinLength;
    if (!/[A-Z]/.test(password)) return t.signup.passwordNeedsUppercase;
    if (!/[a-z]/.test(password)) return t.signup.passwordNeedsLowercase;
    if (!/[0-9]/.test(password)) return t.signup.passwordNeedsNumber;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return t.signup.passwordNeedsSpecialChar;
    }
    if (!confirmPassword) return t.signup.enterConfirmPassword;
    if (password !== confirmPassword) return t.signup.passwordsNotMatch;

    return "";
  };

  const checkEmailAvailability = async (emailToCheck: string) => {
    setIsCheckingEmail(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/check-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "CART-Mobile-App",
        },
        body: JSON.stringify({ email: emailToCheck.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok && data?.errors?.email?.[0]) {
        setEmailError(data.errors.email[0]);
        return false;
      }

      return true;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const checkPhoneAvailability = async (phoneToCheck: string) => {
    const phoneValidation = normalizeEgyptianMobile(
      phoneToCheck,
      t.signup.invalidEgyptPhone,
    );

    if (!phoneValidation.normalized) return false;

    setIsCheckingPhone(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/check-phone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "CART-Mobile-App",
        },
        body: JSON.stringify({ phone: phoneValidation.normalized }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok && data?.errors?.phone?.[0]) {
        setPhoneError(data.errors.phone[0]);
        return false;
      }

      return true;
    } finally {
      setIsCheckingPhone(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!email.trim() || validateEmail()) return;

      checkEmailAvailability(email).catch(() => {
        // Passive availability checks should not interrupt typing.
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const phoneValidation = normalizeEgyptianMobile(
        phone,
        t.signup.invalidEgyptPhone,
      );

      if (!phoneValidation.normalized) return;

      checkPhoneAvailability(phoneValidation.normalized).catch(() => {
        // Passive availability checks should not interrupt typing.
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [phone]);

  const onDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");

    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setDateOfBirthError("");
    }
  };

  const buildAddressPayload = (): SignupAddress | null => {
    if (!addressEnabled) return null;

    return compactOptionalAddressFields({
      label: addressLabel,
      street: addressStreet.trim(),
      city: addressCity.trim(),
      building: addressBuilding.trim(),
      floor: addressFloor.trim(),
      apartment: addressApartment.trim(),
      area: addressArea.trim(),
      landmark: addressLandmark.trim(),
      is_default: true,
    });
  };

  const handleNext = async () => {
    if (loading) return;

    if (step === 1) {
      if (!validateStep1()) return;

      setLoading(true);
      try {
        const phoneValidation = normalizeEgyptianMobile(
          phone,
          t.signup.invalidEgyptPhone,
        );
        const [emailAvailable, phoneAvailable] = await Promise.all([
          checkEmailAvailability(email),
          checkPhoneAvailability(phoneValidation.normalized ?? phone),
        ]);

        if (!emailAvailable || !phoneAvailable) {
          Alert.alert(t.signup.validationError, t.signup.checkInputData);
          return;
        }

        setStep(2);
      } catch {
        Alert.alert(t.common.error, t.alerts.networkError);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 2) {
      if (!validateStep2()) {
        Alert.alert(t.signup.validationError, t.signup.checkInputData);
        return;
      }

      setStep(3);
      return;
    }

    const nextPasswordError = validateStep3();
    setPasswordError(nextPasswordError);

    if (nextPasswordError) {
      Alert.alert(t.common.error, nextPasswordError);
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizeEgyptianMobile(
        phone,
        t.signup.invalidEgyptPhone,
      ).normalized;

      if (!normalizedPhone) {
        setStep(1);
        setPhoneError(t.signup.invalidEgyptPhone);
        return;
      }

      if (!dateOfBirth || !gender) {
        setStep(1);
        setDateOfBirthError(!dateOfBirth ? t.signup.selectDateOfBirth : "");
        setGenderError(!gender ? t.signup.selectGender : "");
        return;
      }

      const normalizedName = fullName.trim().replace(/\s+/g, " ");
      const { firstName, lastName } = splitFullName(normalizedName);

      await register({
        full_name: normalizedName,
        first_name: firstName,
        last_name: lastName,
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        date_of_birth: formatDateForApi(dateOfBirth),
        gender,
        password,
        password_confirmation: confirmPassword,
        language,
        address: buildAddressPayload(),
      });

      const { getAuthToken } = await import("@/services/api/base");
      const token = await getAuthToken();
      if (!token) {
        throw new Error(t.signup.missingSessionToken);
      }

      setStep(4);
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 1600);
    } catch (error: any) {
      if (error?.errors) {
        setFullNameError(
          error.errors.full_name?.[0] ||
          error.errors.first_name?.[0] ||
          error.errors.last_name?.[0] ||
          "",
        );
        setEmailError(error.errors.email?.[0] || "");
        setPhoneError(error.errors.phone?.[0] || "");
        setDateOfBirthError(error.errors.date_of_birth?.[0] || "");
        setGenderError(error.errors.gender?.[0] || "");
        setAddressErrors({
          street: error.errors["address.street"]?.[0] || "",
          city: error.errors["address.city"]?.[0] || "",
        });
        setPasswordError(error.errors.password?.[0] || "");

        if (error.errors["address.street"] || error.errors["address.city"] || error.errors["address.label"]) {
          setStep(2);
        } else if (error.errors.password) {
          setStep(3);
        } else {
          setStep(1);
        }

        Alert.alert(t.signup.validationError, error.message || t.signup.checkInputData);
      } else {
        Alert.alert(t.common.error, error?.message || t.signup.registrationFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressBar}>
      {[1, 2, 3, 4].map((progressStep) => (
        <View
          key={progressStep}
          style={[
            styles.progressStep,
            step >= progressStep && styles.progressStepActive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t.signup.createAccount}</Text>
      <Text style={styles.stepSubtitle}>{t.signup.enterPersonalInfo}</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.fullName}</Text>
          <View style={[styles.inputWrapper, fullNameError && styles.inputError]}>
            <User size={20} color={Colors.neutralMedium} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.signup.enterFullNamePlaceholder}
              placeholderTextColor={Colors.neutralMedium}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setFullNameError("");
              }}
              autoCapitalize="words"
              textContentType="name"
            />
          </View>
          {fullNameError ? <Text style={styles.errorText}>{fullNameError}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.email}</Text>
          <View style={[styles.inputWrapper, emailError && styles.inputError]}>
            <Mail size={20} color={Colors.neutralMedium} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t.signup.enterEmailPlaceholder}
              placeholderTextColor={Colors.neutralMedium}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            {isCheckingEmail && (
              <ActivityIndicator size="small" color={Colors.primary900} />
            )}
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.phoneNumber}</Text>
          <View style={[styles.inputWrapper, phoneError && styles.inputError]}>
            <Phone size={20} color={Colors.neutralMedium} style={styles.inputIcon} />
            <View style={styles.countryCodePill}>
              <Text style={styles.countryCodeText}>+20</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="1012345678"
              placeholderTextColor={Colors.neutralMedium}
              value={phone}
              onChangeText={(text) => {
                setPhone((current) =>
                  sanitizeEgyptianMobileInput(text, current),
                );
                setPhoneError("");
              }}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
            {isCheckingPhone && (
              <ActivityIndicator size="small" color={Colors.primary900} />
            )}
          </View>
          <Text style={phoneError ? styles.errorText : styles.helperText}>
            {phoneError || t.signup.phoneHelper}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.dateOfBirth}</Text>
          <TouchableOpacity
            style={[
              styles.inputWrapper,
              styles.dateInputWrapper,
              dateOfBirthError && styles.inputError,
            ]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.75}
          >
            <Calendar
              size={20}
              color={Colors.neutralMedium}
              style={styles.inputIcon}
            />
            <Text
              style={[
                styles.dateText,
                !dateOfBirth && styles.placeholderText,
              ]}
            >
              {dateOfBirth
                ? dateOfBirth.toLocaleDateString()
                : t.signup.selectDateOfBirth}
            </Text>
          </TouchableOpacity>
          {dateOfBirthError ? (
            <Text style={styles.errorText}>{dateOfBirthError}</Text>
          ) : null}
          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth || new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.gender}</Text>
          <View style={styles.segmentedControl}>
            {(["male", "female", "other"] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.segmentedOption,
                  gender === option && styles.segmentedOptionActive,
                ]}
                onPress={() => {
                  setGender(option);
                  setGenderError("");
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.segmentedText,
                    gender === option && styles.segmentedTextActive,
                  ]}
                >
                  {option === "male"
                    ? t.signup.male
                    : option === "female"
                      ? t.signup.female
                      : t.signup.other}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {genderError ? <Text style={styles.errorText}>{genderError}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.language}</Text>
          <View style={styles.languageToggle}>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === "en" && styles.languageOptionActive,
              ]}
              onPress={() => void setAppLanguage("en")}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "en" && styles.languageTextActive,
                ]}
              >
                {t.ui.english}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageOption,
                language === "ar" && styles.languageOptionActive,
              ]}
              onPress={() => void setAppLanguage("ar")}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "ar" && styles.languageTextActive,
                ]}
              >
                {t.ui.arabic}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t.signup.deliveryAddress}</Text>
      <Text style={styles.stepSubtitle}>{t.signup.addressOptionalSubtitle}</Text>

      <View style={styles.form}>
        <TouchableOpacity
          style={styles.addressToggleRow}
          onPress={() => {
            setAddressEnabled((enabled) => !enabled);
            setAddressErrors({});
          }}
          activeOpacity={0.8}
        >
          <View style={styles.addressToggleCopy}>
            <View style={styles.addressIconCircle}>
              <MapPin size={20} color={Colors.primary900} />
            </View>
            <View style={styles.addressToggleTextWrap}>
              <Text style={styles.addressToggleTitle}>
                {t.signup.addAddressNow}
              </Text>
              <Text style={styles.addressToggleSubtitle}>
                {t.signup.skipAddressHelper}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.switchTrack,
              addressEnabled && styles.switchTrackActive,
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                addressEnabled && styles.switchThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>

        {addressEnabled ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t.signup.addressLabel}</Text>
              <View style={styles.segmentedControl}>
                {(["Home", "Work", "Other"] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.segmentedOption,
                      addressLabel === option && styles.segmentedOptionActive,
                    ]}
                    onPress={() => setAddressLabel(option)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.segmentedText,
                        addressLabel === option && styles.segmentedTextActive,
                      ]}
                    >
                      {option === "Home"
                        ? t.signup.home
                        : option === "Work"
                          ? t.signup.work
                          : t.signup.other}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t.signup.streetAddress}</Text>
              <View
                style={[
                  styles.inputWrapper,
                  styles.textAreaWrapper,
                  addressErrors.street && styles.inputError,
                ]}
              >
                <TextInput
                  style={[styles.input, styles.textAreaInput]}
                  placeholder={t.signup.enterStreetAddressPlaceholder}
                  placeholderTextColor={Colors.neutralMedium}
                  value={addressStreet}
                  onChangeText={(text) => {
                    setAddressStreet(text);
                    setAddressErrors((errors) => ({ ...errors, street: "" }));
                  }}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              {addressErrors.street ? (
                <Text style={styles.errorText}>{addressErrors.street}</Text>
              ) : null}
            </View>

            <View style={styles.rowFields}>
              <View style={styles.rowField}>
                <Text style={styles.label}>{t.signup.city}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    addressErrors.city && styles.inputError,
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    placeholder={t.signup.enterCityPlaceholder}
                    placeholderTextColor={Colors.neutralMedium}
                    value={addressCity}
                    onChangeText={(text) => {
                      setAddressCity(text);
                      setAddressErrors((errors) => ({ ...errors, city: "" }));
                    }}
                  />
                </View>
                {addressErrors.city ? (
                  <Text style={styles.errorText}>{addressErrors.city}</Text>
                ) : null}
              </View>

              <View style={styles.rowField}>
                <Text style={styles.label}>{t.signup.area}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder={t.signup.enterAreaPlaceholder}
                    placeholderTextColor={Colors.neutralMedium}
                    value={addressArea}
                    onChangeText={setAddressArea}
                  />
                </View>
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={styles.rowField}>
                <Text style={styles.label}>{t.signup.building}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder={t.signup.enterBuildingPlaceholder}
                    placeholderTextColor={Colors.neutralMedium}
                    value={addressBuilding}
                    onChangeText={setAddressBuilding}
                  />
                </View>
              </View>

              <View style={styles.rowField}>
                <Text style={styles.label}>{t.signup.floor}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder={t.signup.enterFloorPlaceholder}
                    placeholderTextColor={Colors.neutralMedium}
                    value={addressFloor}
                    onChangeText={setAddressFloor}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t.signup.apartment}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t.signup.enterApartmentPlaceholder}
                  placeholderTextColor={Colors.neutralMedium}
                  value={addressApartment}
                  onChangeText={setAddressApartment}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t.signup.landmark}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t.signup.enterLandmarkPlaceholder}
                  placeholderTextColor={Colors.neutralMedium}
                  value={addressLandmark}
                  onChangeText={setAddressLandmark}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.skipAddressBox}>
            <Text style={styles.skipAddressText}>
              {t.signup.skipAddressConfirmation}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t.signup.createPassword}</Text>
      <Text style={styles.stepSubtitle}>{t.signup.chooseStrongPassword}</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.password}</Text>
          <View style={[styles.inputWrapper, passwordError && styles.inputError]}>
            <LockIcon size={20} color={Colors.neutralMedium} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t.signup.enterPasswordPlaceholder}
              placeholderTextColor={Colors.neutralMedium}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError("");
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((visible) => !visible)}
              style={styles.eyeIcon}
            >
              {showPassword ? (
                <EyeOff size={20} color={Colors.neutralMedium} />
              ) : (
                <Eye size={20} color={Colors.neutralMedium} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t.signup.confirmPassword}</Text>
          <View style={[styles.inputWrapper, passwordError && styles.inputError]}>
            <LockIcon size={20} color={Colors.neutralMedium} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t.signup.confirmPasswordPlaceholder}
              placeholderTextColor={Colors.neutralMedium}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setPasswordError("");
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((visible) => !visible)}
              style={styles.eyeIcon}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={Colors.neutralMedium} />
              ) : (
                <Eye size={20} color={Colors.neutralMedium} />
              )}
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>

        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>
            {t.signup.passwordMustContain}
          </Text>
          <RequirementRow met={password.length >= 8} text={t.signup.atLeast8Chars} />
          <RequirementRow met={/[A-Z]/.test(password)} text={t.signup.oneUppercase} />
          <RequirementRow met={/[a-z]/.test(password)} text={t.signup.oneLowercase} />
          <RequirementRow met={/[0-9]/.test(password)} text={t.signup.oneNumber} />
          <RequirementRow
            met={/[!@#$%^&*(),.?":{}|<>]/.test(password)}
            text={t.signup.oneSpecialChar}
          />
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.successContainer}>
      <View style={styles.successRingOuter}>
        <View style={styles.successRingInner}>
          <View style={styles.successCircle}>
            <Check size={48} color={Colors.neutralWhite} strokeWidth={3} />
          </View>
        </View>
      </View>
      <Text style={styles.successTitle}>{t.signup.accountCreated}</Text>
      <Text style={styles.successMessage}>{t.signup.accountCreatedSuccess}</Text>
      <View style={styles.successDivider} />
      <Text style={styles.successRedirecting}>{t.ui.redirectingToHome}</Text>
      <ActivityIndicator
        size="small"
        color={Colors.primary900}
        style={styles.successLoader}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          {step > 1 && step < 4 && (
            <TouchableOpacity
              onPress={() => {
                clearServerErrors();
                setStep((current) => (current > 1 ? ((current - 1) as Step) : current));
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          )}
          {step < 4 && renderProgressBar()}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {step < 4 && (
            <TouchableOpacity
              style={[styles.nextButton, loading && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.neutralWhite} />
              ) : (
                <Text style={styles.nextButtonText}>
                  {step === 3
                    ? t.signup.createAccountButton
                    : step === 2 && !addressEnabled
                      ? t.signup.skipAddressButton
                      : t.common.next}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {step === 1 && (
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>
                {t.signup.alreadyHaveAccount}{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.loginLink}>{t.signup.signIn}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RequirementRow({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.requirementRow}>
      <Check size={16} color={met ? Colors.primary700 : Colors.neutralMedium} />
      <Text style={[styles.requirementText, met && styles.requirementMet]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutralCloud,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressBar: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.neutralGray,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: Colors.primary900,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.h1,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    fontSize: Typography.bodyLarge,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    minHeight: 56,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginEnd: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralCharcoal,
    minHeight: 52,
  },
  dateInputWrapper: {
    justifyContent: "flex-start",
  },
  dateText: {
    flex: 1,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralCharcoal,
  },
  placeholderText: {
    color: Colors.neutralMedium,
  },
  countryCodePill: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginRight: Spacing.sm,
  },
  countryCodeText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_700Bold",
    color: Colors.primary900,
  },
  passwordInput: {
    paddingRight: I18nManager.isRTL ? undefined : Spacing.xxl,
    paddingLeft: I18nManager.isRTL ? Spacing.xxl : undefined,
  },
  eyeIcon: {
    padding: Spacing.xs,
    position: "absolute",
    right: I18nManager.isRTL ? undefined : Spacing.sm,
    left: I18nManager.isRTL ? Spacing.sm : undefined,
  },
  inputError: {
    borderColor: Colors.accentRed,
  },
  errorText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.accentRed,
    marginTop: Spacing.xs,
  },
  helperText: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  segmentedOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    backgroundColor: Colors.neutralCloud,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  segmentedOptionActive: {
    borderColor: Colors.primary900,
    backgroundColor: Colors.primary900,
  },
  segmentedText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },
  segmentedTextActive: {
    color: Colors.neutralWhite,
  },
  addressToggleRow: {
    minHeight: 78,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    backgroundColor: Colors.neutralCloud,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  addressToggleCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addressIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.neutralWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  addressToggleTextWrap: {
    flex: 1,
  },
  addressToggleTitle: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
  },
  addressToggleSubtitle: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    lineHeight: 18,
    marginTop: 2,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutralGray,
    padding: 3,
    justifyContent: "center",
  },
  switchTrackActive: {
    backgroundColor: Colors.primary900,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.neutralWhite,
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  skipAddressBox: {
    borderRadius: 12,
    backgroundColor: Colors.neutralCloud,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    padding: Spacing.md,
  },
  skipAddressText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    lineHeight: 22,
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    minHeight: 94,
    paddingVertical: Spacing.sm,
  },
  textAreaInput: {
    minHeight: 76,
    paddingTop: 0,
  },
  rowFields: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  rowField: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  languageToggle: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  languageOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    backgroundColor: Colors.neutralCloud,
    alignItems: "center",
  },
  languageOptionActive: {
    borderColor: Colors.primary900,
    backgroundColor: Colors.primary900,
  },
  languageText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
  },
  languageTextActive: {
    color: Colors.neutralWhite,
  },
  requirementsContainer: {
    backgroundColor: Colors.neutralCloud,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  requirementsTitle: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_600SemiBold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  requirementText: {
    fontSize: Typography.bodyMedium,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  requirementMet: {
    color: Colors.primary700,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  successRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  successRingInner: {
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: Colors.success100,
    justifyContent: "center",
    alignItems: "center",
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary900,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  successMessage: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  successDivider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary900,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  successRedirecting: {
    fontSize: Typography.bodySmall,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
  },
  successLoader: {
    marginTop: Spacing.md,
  },
  nextButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: Spacing.xl,
  },
  nextButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  loginText: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_400Regular",
    color: Colors.neutralMedium,
  },
  loginLink: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_700Bold",
    color: Colors.primary900,
  },
});
