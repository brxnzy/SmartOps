export interface User{
    id: string,
    name: string,
    email: string
}

export interface AuthContextType{
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
}