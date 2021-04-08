# Hypersign Authentication Server

The **Hypersign Authentication Server** is privacy preserving software which is used to verify userdata (email, for now) and issue a cryptographically signed document, called Hypersign Auth Credential, to the end-user. The user can use this credential to authenticate into website that supports Hypersign Auth Credential in passwordless fashion. The server implements [Hypersign Protocol](hypersign.id) which is based on SSI standards.

## Protects your data by not storing in silos

> **The server does NOT store any user data. It does NOT even has a database at present.**

You can read more about hypersign @ [docs.hypersign.id](https://docs.hypersign.id).

## Preserves your privacy

Unlike, other social login (like F\*ceb\*\*k :p) it does not even track any user, meaning;

> **The hypersign server does not know whether you are buying from Amazon or travelling to Vegas!**

## Install and usage

Note: Make sure you have `hypersign.json` file in your root folder.

Install dependencies
```bash
npm i 
```

Development

```bash
npm run dev 
```

```
npm run build:dev
npm run start  
```

Production

```bash
npm run build:prod 
npm run prod #production
```
Note: Create `production.env` for production run

### Dockerization

Build docker image
```
npm run build:prod
docker build -t hs-auth-server .  # build an image
```

Run container
```
docker run -p 5000:5000 -d hs-auth-server
```
Note: Create `production.env` for production run
