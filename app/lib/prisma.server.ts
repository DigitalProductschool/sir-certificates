import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client";

const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;
const PrismaClientUnknownRequestError = Prisma.PrismaClientUnknownRequestError;
const PrismaClientInitializationError = Prisma.PrismaClientInitializationError;
const PrismaClientValidationError = Prisma.PrismaClientValidationError;
const PrismaClientRustPanicError = Prisma.PrismaClientRustPanicError;

// Create and export global PrismaClient
const connectionString = `${process.env.DATABASE_URL}`;
let prisma: PrismaClient;
let adapter: PrismaPg;

declare global {
	var __db: PrismaClient | undefined;
	var __adapter: PrismaPg | undefined;
}

if (process.env.NODE_ENV === "production") {
	adapter = new PrismaPg({ connectionString });
	prisma = new PrismaClient({ adapter });
} else {
	// prevent live-reloads from saturating the database with connections while developing
	if (!global.__adapter) {
		adapter = global.__adapter = new PrismaPg({ connectionString });

		if (!global.__db) {
			prisma = global.__db = new PrismaClient({ adapter });
		}
	}
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
