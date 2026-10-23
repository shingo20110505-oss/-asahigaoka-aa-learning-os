// Accept older backups with one attachment and newer records with many.
export function materialFiles(item){return Array.isArray(item.attachments)?item.attachments:item.attachment?[item.attachment]:[];}
export function referencedFileIds(state){return new Set([...(state.materials||[]),...(state.notes||[])].flatMap(materialFiles).map(f=>f.id));}
export async function appendMaterialFiles(item,files,save){
  const attachments=materialFiles(item).slice();
  for(const file of files)if(file&&typeof file.name==='string'&&file.name)attachments.push(await save(file));
  return attachments;
}
