import fs from 'fs';

export const existDir= (dirPath) => {
if(!dirPath) throw new Error("Directory path undefined")
return fs.existsSync(dirPath)

}

export const createDir = (dirPath) => {
    if(!dirPath) throw new Error("Directory path undefined")
    return fs.mkdirSync(dirPath)
}
export const store = (data, filePath) => {
    if (!data) throw new Error("Data undefined")
    fs.writeFileSync(filePath, JSON.stringify(data))
}

export const retrive = (filePath) => {
    return fs.readFileSync(filePath, 'utf8')
}

export const deleteFile = (filePath) => {
    return fs.unlink(filePath, (err) => {
        if(err) console.log(`Could not delete the file err ${err}`);
        console.log(`${filePath} is successfully deleted.`)
    });
}