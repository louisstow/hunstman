import { Spider } from "./Spider";
import { Response } from "./Response";
declare const cache: (spider: Spider, skip?: boolean) => Spider | {
    run: (r?: any) => Promise<Response[]>;
};
export { cache };
