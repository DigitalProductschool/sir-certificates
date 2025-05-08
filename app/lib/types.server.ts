export type RegisterForm = {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
};

export type LoginForm = {
	email: string;
	password: string;
};

export type InviteForm = {
	email: string;
	firstName: string;
	lastName: string;
	adminOfPrograms?: number[]
};

// @todo add types for other forms
