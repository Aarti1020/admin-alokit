import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const deployDir = path.join(rootDir, "hostinger-admin-static-deploy");

if (!fs.existsSync(outDir)) {
  throw new Error("The out folder was not found. Run `npm run build` first.");
}

fs.rmSync(deployDir, { recursive: true, force: true });
fs.mkdirSync(deployDir, { recursive: true });
fs.cpSync(outDir, deployDir, { recursive: true });

const htaccess = `Options -MultiViews
DirectoryIndex index.html

<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /

RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.+?)/?$ $1.html [L]

RewriteCond %{REQUEST_FILENAME}/index.html -f
RewriteRule ^(.+?)/?$ $1/ [L]

RewriteRule ^.*$ /index.html [L]
</IfModule>
`;

fs.writeFileSync(path.join(deployDir, ".htaccess"), htaccess);

console.log("Created hostinger-admin-static-deploy folder.");
