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
};


// @todo add types for other forms
