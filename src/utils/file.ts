import fs from 'fs'

export const store = (data, filePath) => {
    if (!data) throw new Error("Data undefined")
    fs.writeFileSync(filePath, JSON.stringify(data))
}

export const retrive = (filePath) => {
    return fs.readFileSync(filePath, 'utf8')
}
