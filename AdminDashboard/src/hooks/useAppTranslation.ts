import { useTranslation } from 'react-i18next'

/**
 * Custom hook for app translations with RTL support
 */
export function useAppTranslation() {
    const { t, i18n } = useTranslation()

    const isRTL = i18n.language === 'ar'
    const currentLanguage = i18n.language

    const changeLanguage = async (lang: 'en' | 'ar') => {
        await i18n.changeLanguage(lang)
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = lang
        document.body.classList.remove('ltr', 'rtl')
        document.body.classList.add(lang === 'ar' ? 'rtl' : 'ltr')
    }

    // Format date based on current language
    const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
        const d = typeof date === 'string' ? new Date(date) : date
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
        const defaultOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }
        return d.toLocaleDateString(locale, options || defaultOptions)
    }

    // Format currency based on current language
    const formatCurrency = (amount: number) => {
        if (i18n.language === 'ar') {
            return `${amount.toLocaleString('ar-EG')} ج.م`
        }
        return `EGP ${amount.toLocaleString('en-US')}`
    }

    // Format number based on current language
    const formatNumber = (num: number) => {
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
        return num.toLocaleString(locale)
    }

    // Get direction-aware classes
    const getDirectionalClass = (ltrClass: string, rtlClass: string) => {
        return isRTL ? rtlClass : ltrClass
    }

    // Get space class (space-x-3 vs space-x-reverse)
    const getSpaceClass = (size: number = 3) => {
        return isRTL ? `space-x-reverse space-x-${size}` : `space-x-${size}`
    }

    // Get margin class (mr vs ml)
    const getMarginEndClass = (size: number = 2) => {
        return isRTL ? `ml-${size}` : `mr-${size}`
    }

    const getMarginStartClass = (size: number = 2) => {
        return isRTL ? `mr-${size}` : `ml-${size}`
    }

    // Get text alignment class
    const getTextAlignClass = () => {
        return isRTL ? 'text-right' : 'text-left'
    }

    return {
        t,
        i18n,
        isRTL,
        currentLanguage,
        changeLanguage,
        formatDate,
        formatCurrency,
        formatNumber,
        getDirectionalClass,
        getSpaceClass,
        getMarginEndClass,
        getMarginStartClass,
        getTextAlignClass,
    }
}

export default useAppTranslation
