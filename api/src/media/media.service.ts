import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryConfig } from '../common/cloudinary';

const FOLDERS = { image: 'basa-tayo/words/images', audio: 'basa-tayo/words/audio' };

@Injectable()
export class MediaService {
  /**
   * Signs one direct upload from the teacher's browser. Only timestamp and
   * folder are signed, so the browser must send exactly those (plus file,
   * api_key and signature). Cloudinary keeps audio under the "video" type.
   */
  signature(kind: 'image' | 'audio') {
    const config = cloudinaryConfig();
    if (!config) throw new ServiceUnavailableException('Hindi naka-set up ang Cloudinary.');
    const timestamp = Math.round(Date.now() / 1000);
    const folder = FOLDERS[kind];
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, config.apiSecret);
    return {
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      timestamp,
      signature,
      folder,
      resourceType: kind === 'image' ? 'image' : 'video',
    };
  }
}
