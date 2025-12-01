# Certiffy – an open-source certificate generation and distribution tool

Certiffy helps you create and deliver beautiful certificates (and other documents) to people.

- generate on-brand, custom-designed certificates with your own fonts
- simple and reliable delivery via email
- enhance your visibility and reach with shareable weblinks, complete with on-brand social media previews

Certiffy is open-source software and can be installed and run on your own infrastructure. If you prefer some help with hosting the tool or designing great certificate templates, reach out to marcus@dpschool.io 


## Development

1. Create an empty postgreSQL database.
2. Copy `.env.template` and rename it to `.env`.
3. Adjust `DATABASE_URL` in `.env` to match you settings.
4. Adjust the `SEED_ADMIN_*` settings for your admin user.

Install dependencies:

```shellscript
npm run install
```

> If npm install produces a node-gyp error while installing the canvas dependency, try the `--build-from-source` option and install the dependencies first
> https://github.com/Automattic/node-canvas?tab=readme-ov-file#compiling


When running for the first time, run these commands to take care of database consistency:

```shellscript
npx prisma generate
npx prisma db push
npx prisma db seed

Install fonts:
We've added Montserrat (open font) as an example for now. Custom fonts can be installed to `/storage/fonts`. 

Run the dev server:

```shellscript
npm run dev
```

## Configuration

### MailJet

Certiffy uses Mailjet to deliver certificates, email notifications and other transactional emails for user verification. You need to setup both the public and private keys for your Mailjet account.

- MJ_APIKEY_PUBLIC
- MJ_APIKEY_PRIVATE

### Google Login

If you want to enable Login with Google, also configure the following environment variables

- GOOGLE_LOGIN_CLIENT_ID
- GOOGLE_LOGIN_CLIENT_SECRET

Instructions for setting up the Google APIs and getting a key can be found here: https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred

### Photo background removal

Certiffy can use an external API to remove the background from uploaded user photos. This can be useful for creating cool social media preview images for shared certificates. Reach out to us to get the specifics.

- BACKGROUND_REMOVAL_URL


## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

### Automatic deployments

The repo is set up for automatic deployments to a Dokku host, but can also be deployed to Coolify or other Docker-based environments.

When pushing changes to `main`, they will be automatically deployed.

When opening a Pull Request from a different branch, a preview deployment will be automatically set up. The preview deployment will run the code from the current branch on a different URL.

Caveats:

-   preview deployments currently interact with the production database, so be careful
- 	storage: `dokku storage:ensure-directory --chown root [app]`, `dokku storage:mount [app] host-path:container-path`, `dokku ps:restart app-name`

Server disk clean-up:

- See available disk space `df -h`
- See docker disk usage `docker system df`
- Reclaim space from docker `docker system prune` (-a / -f)

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

-   `build/server`
-   `build/client`

## Styling

We use [Tailwind CSS](https://tailwindcss.com/) and [ShadCn UI](https://ui.shadcn.com/docs).

The UI components are located in `/app/components/ui`.

To add a UI component, run `npx shadcn-ui@0.8.0 add dialog` (we're currently on version 0.8.0)

See the Remix.run and [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information on how to use custom css.
