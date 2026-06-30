declare module 'lucide-react-native' {
    import { SvgProps } from 'react-native-svg';
    import { ComponentType } from 'react';

    export interface IconProps extends SvgProps {
        size?: number | string;
        color?: string;
        strokeWidth?: number | string;
    }

    export type Icon = ComponentType<IconProps>;

    export const ArrowLeft: Icon;
    export const Calendar: Icon;
    export const Eye: Icon;
    export const EyeOff: Icon;
    export const Fingerprint: Icon;
    export const Lock: Icon;
    export const Mail: Icon;
    export const MapPin: Icon;
    export const Phone: Icon;
    export const User: Icon;
    export const Plus: Icon;
    export const AlertCircle: Icon;
    export const ChevronRight: Icon;
    export const MessageSquare: Icon;
    export const Send: Icon;
    export const Paperclip: Icon;
    export const FileText: Icon;
    export const Check: Icon;
    export const Clock: Icon;
    export const ChevronDown: Icon;
    export const Package: Icon;
    export const X: Icon;
    export const Image: Icon;
    export const File: Icon;
    // Add other icons as needed
}
