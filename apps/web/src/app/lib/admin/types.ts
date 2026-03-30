type Me = {
    id: string;
    email: string;
    phone: string | null;
    role: string;
};

type Student = {
    id: string;
    createdAt: string;
    email: string;
    phone: string | null;
    role: string;
};

type DrivingCategory = {
    id: string;
    code: string;
    name: string;
    minAge: number | null;
    description: string | null;
};

type Instructor = {
    id: string;
    createdAt: string;
    email: string;
    phone: string | null;
    role: string;
    firstName: string | null;
    lastName: string | null;
    drivingCategories: {
        id: string;
        code: string;
        name: string;
    }[];
};

type ContractItem = {
    path: string;
    fileName: string;
    size: number;
    updatedAt: string;
};

type ContractPreview = {
    path: string;
    fileName: string;
    size: number;
    updatedAt: string;
    content: string;
};