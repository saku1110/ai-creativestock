declare module 'fluent-ffmpeg' {
  const ffmpeg: any;
  export default ffmpeg;
}

declare module 'ffmpeg-static' {
  const path: string;
  export default path;
}

declare module '@aws-sdk/client-rekognition' {
  export class RekognitionClient {
    constructor(options: Record<string, unknown>);
    send(command: unknown): Promise<unknown>;
  }
  export class DetectFacesCommand {
    constructor(input: Record<string, unknown>);
  }
  export class DetectLabelsCommand {
    constructor(input: Record<string, unknown>);
  }
}
