import { Spider } from "./Spider";
import { Response } from "./Response";
declare const cache: (spider: Spider, skip?: boolean | undefined) => Spider | {
    run: (r?: any) => Promise<Response[]>;
};
export { cache };
