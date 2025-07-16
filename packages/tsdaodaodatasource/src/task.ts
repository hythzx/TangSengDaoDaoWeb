import { WKApp } from "@tsdaodao/base";
import axios, { Canceler } from "axios";
import { MediaMessageContent } from "wukongimjssdk";
import {  MessageTask, TaskStatus } from "wukongimjssdk";



export class MediaMessageUploadTask extends MessageTask {
    private _progress?:number
    private canceler: Canceler | undefined
    getUUID(){
        var len=32;//32长度
        var radix=16;//16进制
        var chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');var uuid=[],i;radix=radix||chars.length;if(len){for(i=0;i<len;i++)uuid[i]=chars[0|Math.random()*radix];}else{var r;uuid[8]=uuid[13]=uuid[18]=uuid[23]='-';uuid[14]='4';for(i=0;i<36;i++){if(!uuid[i]){r=0|Math.random()*16;uuid[i]=chars[(i===19)?(r&0x3)|0x8:r];}}}
        return uuid.join('');
      }

    // 清理文件名，移除特殊字符，保留可用于路径的部分
    cleanFileName(fileName: string): string {
        if (!fileName) return '';
        
        // 获取文件名（不包含扩展名）
        const lastDotIndex = fileName.lastIndexOf('.');
        const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
        
        // 移除或替换特殊字符，保留中文、英文、数字、下划线、短横线
        const cleaned = nameWithoutExt
            .replace(/[<>:"/\\|?*]/g, '') // 移除Windows文件系统不允许的字符
            .replace(/\s+/g, '_') // 将空格替换为下划线
            .replace(/[^\w\u4e00-\u9fa5-]/g, '') // 只保留字母、数字、下划线、短横线和中文字符
            .substring(0, 50); // 限制长度避免路径过长
        
        return cleaned || 'file'; // 如果清理后为空，则使用默认名称
    }

    async start(): Promise<void> {
        const mediaContent = this.message.content as MediaMessageContent
        if(mediaContent.file) {
            const param = new FormData();
            param.append("file", mediaContent.file);
            const uuid = this.getUUID();
            
            // 生成更有意义的文件名：清理后的原始文件名 + 短UUID + 扩展名
            const cleanedName = this.cleanFileName(mediaContent.file.name);
            const shortUuid = uuid.substring(0, 8); // 使用短UUID避免路径过长
            const fileName = `${cleanedName}_${shortUuid}`;
            
            const path = `/${this.message.channel.channelType}/${this.message.channel.channelID}/${fileName}.${mediaContent.extension??""}`
            const uploadURL = await  this.getUploadURL(path)
            if(uploadURL) {
                this.uploadFile(mediaContent.file,uploadURL)

            }else{
                console.log('获取上传地址失败！')
                this.status = TaskStatus.fail
                this.update()
            }
        }else {
            console.log('多媒体消息不存在附件！');
            if (mediaContent.remoteUrl && mediaContent.remoteUrl !== "") {
                this.status = TaskStatus.success
                this.update()
            } else {
                this.status = TaskStatus.fail
                this.update()
            }
        }
    }

   async uploadFile(file:File,uploadURL:string) {
        const param = new FormData();
        param.append("file", file);
        const resp = await axios.post(uploadURL,param,{
            headers: { "Content-Type": "multipart/form-data" },
            cancelToken: new axios.CancelToken((c: Canceler) => {
                this.canceler = c
            }),
            onUploadProgress: e => {
                var completeProgress = ((e.loaded / e.total) | 0);
                this._progress = completeProgress
                this.update()
            }
        }).catch(error => {
            console.log('文件上传失败！->', error);
            this.status = TaskStatus.fail
            this.update()
        })
        if(resp) {
            if(resp.data.path) {
                const mediaContent = this.message.content as MediaMessageContent
                mediaContent.remoteUrl = resp.data.path
                this.status = TaskStatus.success
                this.update()
            }
        }
    }

    // 获取上传路径
    async getUploadURL(path:string) :Promise<string|undefined> {
       const result = await WKApp.apiClient.get(`file/upload?path=${path}&type=chat`)
       if(result) {
           return result.url
       }
    }

    suspend(): void {
    }
    resume(): void {
       
    }
    cancel(): void {
        this.status = TaskStatus.cancel
        if(this.canceler) {
            this.canceler()
        }
        this.update()
    }
    progress(): number {
        return this._progress??0
    }

}
