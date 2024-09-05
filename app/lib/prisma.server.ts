import { PrismaClient, Prisma } from "@prisma/client";
const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;
const PrismaClientUnknownRequestError = Prisma.PrismaClientUnknownRequestError;
const PrismaClientInitializationError = Prisma.PrismaClientInitializationError;
const PrismaClientValidationError = Prisma.PrismaClientValidationError;
const PrismaClientRustPanicError = Prisma.PrismaClientRustPanicError;

// Create and export global PrismaClient
let prisma: PrismaClient;
declare global {
	// eslint-disable-next-line no-var
	var __db: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
	prisma = new PrismaClient();
	prisma.$connect();
} else {
	// prevent live-reloads from saturating the database with connections while developing
	if (!global.__db) {
		global.__db = new PrismaClient();
		global.__db.$connect();
	}
	prisma = global.__db;
}

const throwErrorResponse = (
	error:
		| Error
		| typeof PrismaClientKnownRequestError
		| typeof PrismaClientUnknownRequestError
		| typeof PrismaClientInitializationError
		| typeof PrismaClientInitializationError
		| typeof PrismaClientValidationError
		| typeof PrismaClientRustPanicError,
	info: string,
) => {
	let errorMessage = info;
	if (error instanceof PrismaClientKnownRequestError) {
		errorMessage = `${info}. ${error.meta ? `Check ${JSON.stringify(error.meta?.target)}.` : ""} (Error ${error.code})`;
		throw new Response(errorMessage, {
			status: 400,
			statusText: errorMessage,
		});
	}

	throw new Response(errorMessage, {
		status: 500,
		statusText: errorMessage,
	});
};

export {
	prisma,
	throwErrorResponse,
	PrismaClientKnownRequestError,
	PrismaClientUnknownRequestError,
	PrismaClientInitializationError,
	PrismaClientValidationError,
	PrismaClientRustPanicError,
};
