# Hypersign Authentication Server

The **Hypersign Authentication Server** is privacy preserving software which is used to verify userdata (email, for now) and issue a cryptographically signed document, called Hypersign Auth Credential, to the end-user. The user can use this credential to authenticate into website that supports Hypersign Auth Credential in passwordless fashion. The server implements [Hypersign Protocol](hypersign.id) which is based on SSI standards.

## Protects your data by not storing in silos

> **The server does NOT store any user data. It does NOT even has a database at present.**

You can read more about hypersign @ [docs.hypersign.id](https://docs.hypersign.id).

## Preserves your privacy

Unlike, other social login (like F\*ceb\*\*k :p) it does not even track any user, meaning;

> **The hypersign server does not know whether you are buying t-shirt from Amazon or travelling to Vegas!**

## Install and usage

### Install dependencies

```bash
npm i 
```

### Development

```bash
npm run bootstrap # it will generate hypersign.json 
npm run dev 
```
Note: Create `production.env` 

### Production


```bash
npm run bootstrap # it will generate hypersign.json 
npm run build:dev
npm run start  
```
Note: Create `production.env` 


