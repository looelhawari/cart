// Static Pages API Service
// Fetches dynamic content from dashboard (Terms, Privacy, About)

import { api } from "./api";

export interface StaticPage {
    slug: string;
    title: string;
    title_en: string;
    title_ar: string;
    content: string;
    content_en: string;
    content_ar: string;
    last_updated_at: string | null;
}

export interface StaticPageListItem {
    slug: string;
    title: string;
    title_en: string;
    title_ar: string;
    last_updated_at: string | null;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

/**
 * Fetch all static pages (Terms, Privacy, About)
 */
export const getStaticPages = async (
    language: "en" | "ar" = "en"
): Promise<StaticPageListItem[]> => {
    try {
        const response = await api.get<ApiResponse<StaticPageListItem[]>>(
            `/pages?lang=${language}`
        );
        return response.data.data || [];
    } catch (error) {
        console.error("Failed to fetch static pages:", error);
        return [];
    }
};

/**
 * Fetch a single static page by slug
 * @param slug - 'terms', 'privacy', or 'about'
 * @param language - 'en' or 'ar'
 */
export const getStaticPage = async (
    slug: "terms" | "privacy" | "about",
    language: "en" | "ar" = "en"
): Promise<StaticPage | null> => {
    try {
        const response = await api.get<ApiResponse<StaticPage>>(
            `/pages/${slug}?lang=${language}`
        );
        return response.data.data || null;
    } catch (error) {
        console.error(`Failed to fetch ${slug} page:`, error);
        return null;
    }
};

/**
 * Get Terms and Conditions page
 */
export const getTermsPage = async (
    language: "en" | "ar" = "en"
): Promise<StaticPage | null> => {
    return getStaticPage("terms", language);
};

/**
 * Get Privacy Policy page
 */
export const getPrivacyPage = async (
    language: "en" | "ar" = "en"
): Promise<StaticPage | null> => {
    return getStaticPage("privacy", language);
};

/**
 * Get About Us page
 */
export const getAboutPage = async (
    language: "en" | "ar" = "en"
): Promise<StaticPage | null> => {
    return getStaticPage("about", language);
};

export default {
    getStaticPages,
    getStaticPage,
    getTermsPage,
    getPrivacyPage,
    getAboutPage,
};
