import { MediaMessageContent } from "wukongimjssdk"
import React from "react"
import WKApp from "../../App"
import { MessageContentTypeConst } from "../../Service/Const"
import MessageBase from "../Base"
import { MessageCell } from "../MessageCell"
import MessageTrail from "../Base/tail"
import "./index.css"

export class FileContent extends MediaMessageContent {
    url!: string
    name!: string
    size!: number
    extension!: string

    constructor(file?: File) {
        super()
        if (file) {
            this.file = file
            this.name = file.name
            this.size = file.size
            this.extension = this.getFileExtension(file.name)
        }
    }

    private getFileExtension(filename: string): string {
        return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2)
    }

    decodeJSON(content: any) {
        // 处理后端返回的数据结构，内容在payload中
        const payload = content.payload || content
        this.url = payload["url"] || content["url"] || ""
        this.name = payload["name"] || content["name"] || ""
        this.size = payload["size"] || content["size"] || 0
        this.extension = payload["extension"] || content["extension"] || this.getFileExtension(this.name)
        this.remoteUrl = this.url
        
    }

    encodeJSON() {
        return { 
            "url": this.remoteUrl || "", 
            "name": this.name || "",
            "size": this.size || 0,
            "extension": this.extension || ""
        }
    }

    get contentType() {
        return MessageContentTypeConst.file
    }

    get conversationDigest() {
        return `[文件] ${this.name}`
    }
}

export class FileCell extends MessageCell<any, any> {

    state = {
        downloading: false
    }

    formatFileSize(size: number): string {
        if (size < 1024) return `${size} B`
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
        if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
        return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }

    getFileIcon(filename: string, extension: string): string {
        // 如果没有扩展名，从文件名中提取
        let ext = extension || ''
        if (!ext && filename) {
            const parts = filename.split('.')
            ext = parts.length > 1 ? parts[parts.length - 1] : ''
        }

        try {
            // 使用动态导入来避免require缓存问题
            const iconMap: { [key: string]: string } = {
                'pdf': require('./icons/pdf.png').default || require('./icons/pdf.png'),
                'doc': require('./icons/doc.png').default || require('./icons/doc.png'),
                'docx': require('./icons/doc.png').default || require('./icons/doc.png'),
                'xls': require('./icons/excel.png').default || require('./icons/excel.png'),
                'xlsx': require('./icons/excel.png').default || require('./icons/excel.png'),
                'ppt': require('./icons/ppt.png').default || require('./icons/ppt.png'),
                'pptx': require('./icons/ppt.png').default || require('./icons/ppt.png'),
                'txt': require('./icons/txt.png').default || require('./icons/txt.png'),
                'zip': require('./icons/zip.png').default || require('./icons/zip.png'),
                'rar': require('./icons/zip.png').default || require('./icons/zip.png'),
                'mp4': require('./icons/video.png').default || require('./icons/video.png'),
                'avi': require('./icons/video.png').default || require('./icons/video.png'),
                'mp3': require('./icons/audio.png').default || require('./icons/audio.png'),
                'wav': require('./icons/audio.png').default || require('./icons/audio.png'),
            }
            const defaultIcon = require('./icons/file.png').default || require('./icons/file.png')
            return iconMap[ext.toLowerCase()] || defaultIcon
        } catch (error) {
            console.error('加载文件图标失败:', error)
            // 如果图标加载失败，使用一个简单的SVG作为fallback
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzMzNzNCMyIvPgo8cGF0aCBkPSJNMTIgMTJIMjhWMTZIMTJWMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMjBIMjRWMjRIMTJWMjBaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMjhIMjBWMzJIMTJWMjhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'
        }
    }

    handleDownload = async () => {
        const content = this.props.message.content as FileContent
        
        // 防止重复下载
        if (this.state.downloading) {
            return
        }
        
        // 确保文件名包含正确的扩展名
        let fileName = content.name || '未知文件'
        if (content.extension && !fileName.toLowerCase().endsWith(`.${content.extension.toLowerCase()}`)) {
            fileName = `${fileName}.${content.extension}`
        }
        
        // 构造带有filename参数的URL，这样后端会设置正确的Content-Disposition头
        let fileURL = WKApp.dataSource.commonDataSource.getFileURL(content.url)
        try {
            const url = new URL(fileURL)
            url.searchParams.set('filename', fileName)
            fileURL = url.toString()
        } catch (e) {
            console.warn('无法解析URL，使用原始URL:', e)
        }
        
        this.setState({ downloading: true })
        
        try {
            console.log('开始下载文件:', fileName, 'URL:', fileURL)
            
            // 方法1: 尝试直接使用链接下载（最简单的方法）
            const link = document.createElement('a')
            link.href = fileURL
            link.download = fileName
            link.target = '_blank'
            link.style.display = 'none'
            
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            console.log('文件下载触发成功:', fileName)
            
            // 如果上面的方法不行，则使用blob下载
            setTimeout(async () => {
                try {
                    // 使用XMLHttpRequest下载文件作为备用方案
                    const xhr = new XMLHttpRequest()
                    
                    const downloadPromise = new Promise<void>((resolve, reject) => {
                        xhr.open('GET', fileURL, true)
                        xhr.responseType = 'blob'
                        
                        xhr.onload = function() {
                            if (xhr.status === 200) {
                                try {
                                    const blob = xhr.response
                                    const downloadUrl = window.URL.createObjectURL(blob)
                                    const link = document.createElement('a')
                                    
                                    // 设置下载属性
                                    link.href = downloadUrl
                                    link.download = fileName
                                    link.style.display = 'none'
                                    
                                    // 添加到DOM
                                    document.body.appendChild(link)
                                    
                                    // 触发下载
                                    link.click()
                                    
                                    // 清理
                                    setTimeout(() => {
                                        try {
                                            document.body.removeChild(link)
                                            window.URL.revokeObjectURL(downloadUrl)
                                        } catch (e) {
                                            console.warn('清理下载链接时出错:', e)
                                        }
                                    }, 1000)
                                    
                                    console.log('文件下载成功 (备用方案):', fileName)
                                    resolve()
                                } catch (error) {
                                    reject(new Error('创建下载链接失败: ' + error))
                                }
                            } else {
                                // 状态码不是200也不算错误，可能是浏览器直接处理了下载
                                resolve()
                            }
                        }
                        
                        xhr.onerror = function() {
                            // 网络错误时才算真正的错误
                            reject(new Error('网络错误，无法下载文件'))
                        }
                        
                        // 设置超时时间（5秒）- 因为这只是备用方案
                        xhr.timeout = 5000
                        xhr.ontimeout = function() {
                            resolve() // 超时也不算错误，可能浏览器已经开始下载了
                        }
                        
                        // 发送请求
                        xhr.send()
                    })
                    
                    await downloadPromise
                    
                } catch (error) {
                    console.warn('备用下载方案失败:', error)
                    // 这里不抛出错误，因为主要的下载可能已经成功了
                }
            }, 100) // 100ms后执行备用方案检查
            
        } catch (error) {
            console.error('文件下载失败:', error)
            
            // 最后的回退方案：直接打开文件URL
            try {
                window.open(fileURL, '_blank')
                console.log('使用最后回退方案打开文件')
            } catch (fallbackError) {
                console.error('所有下载方法都失败了:', fallbackError)
            }
        } finally {
            // 延迟重置状态，给下载一些时间
            setTimeout(() => {
                this.setState({ downloading: false })
            }, 1000)
        }
    }

    render() {
        const { message, context } = this.props
        const content = message.content as FileContent
        const { downloading } = this.state

        return (
            <MessageBase message={message} context={context}>
                <div className={`wk-message-file ${downloading ? 'downloading' : ''}`} onClick={this.handleDownload}>
                    <div className="wk-message-file-icon">
                        <img src={this.getFileIcon(content.name, content.extension)} alt="file" />
                    </div>
                    <div className="wk-message-file-info">
                        <div className="wk-message-file-name">{content.name || '未知文件'}</div>
                        <div className="wk-message-file-size">
                            {downloading ? '下载中...' : this.formatFileSize(content.size || 0)}
                        </div>
                    </div>
                    <div className="wk-message-file-download">
                        {downloading ? (
                            <div className="wk-message-file-downloading">
                                <svg viewBox="0 0 1024 1024" width="16" height="16" className="loading-icon">
                                    <path d="M512 64c247.4 0 448 200.6 448 448S759.4 960 512 960 64 759.4 64 512 264.6 64 512 64z m0 56C293.2 120 120 293.2 120 512s173.2 392 392 392 392-173.2 392-392S730.8 120 512 120z m0 148c17.7 0 32 14.3 32 32v184l59.3-59.3c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3l-112 112c-12.5 12.5-32.8 12.5-45.3 0l-112-112c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L480 540V300c0-17.7 14.3-32 32-32z"/>
                                </svg>
                            </div>
                        ) : (
                            <svg viewBox="0 0 1024 1024" width="16" height="16">
                                <path d="M505.7 661a8 8 0 0 0 12.6 0l112-141.7c4.1-5.2.4-12.9-6.3-12.9h-74.1V168c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v338.3H400c-6.7 0-10.4 7.7-6.3 12.9L505.7 661z"/>
                                <path d="M878 626h-60c-4.4 0-8 3.6-8 8v154H214V634c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v198c0 17.7 14.3 32 32 32h684c17.7 0 32-14.3 32-32V634c0-4.4-3.6-8-8-8z"/>
                            </svg>
                        )}
                    </div>
                    <MessageTrail message={message} />
                </div>
            </MessageBase>
        )
    }
} 