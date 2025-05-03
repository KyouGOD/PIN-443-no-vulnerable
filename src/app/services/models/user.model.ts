export interface User {
    id: string | number;
    email: string;
    full_name: string;
    is_active: boolean;
    google_id: string | null;
    yandex_id: string | null;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    disabled?: boolean;
}