import axios from 'axios'

const baseURL = 'http://localhost:3002'

/**
 * @description: 上传文件
 * @return {*} 
 * @param {*} url 请求url
 * @param {*} formData 文件数据
 * @param {*} onUploadProgress 进度
 */
export const uploadFile = (url, formData, onUploadProgress = () => {}) => {
  return axios({
    method: 'post',
    url,
    baseURL,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    data: formData,
    onUploadProgress
  })
}

/**
 * @description: 切片上传完成后请求后端合并文件
 * @return {*}
 * @param {*} url 请求地址
 * @param {*} data 数据
 */
export const mergeChunks = (url, data) => {
  return axios({
    method: 'post',
    url,
    baseURL,
    headers: {
      'Content-Type': 'application/json'
    },
    data
  })
}