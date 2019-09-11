import { CommentId, PostId, BlogId, IpfsData } from './types';
import axios from 'axios';

export const host = 'http://localhost:3001/v1';

export async function addJsonToIpfs (ipfsData: IpfsData): Promise<string> {
  const res = await axios.post(`${host}/ipfs/add`, ipfsData);
  const { data } = res;
  return data as string;
}

export async function removeFromIpfs (hash: string) {
  await axios.post(`${host}/ipfs/remove/${hash}`);
}

export async function getJsonFromIpfs<T extends IpfsData> (hash: string): Promise<T> {
  const res = await axios.get(`${host}/ipfs/get/${hash}`);
  const { data } = res;
  console.log(data);
  return data as T;
}