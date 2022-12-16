import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export abstract class ApiService {

    // private apiUrl = 'http://a27afc9d69f9d4c869231eac09110c27-46112890.us-east-2.elb.amazonaws.com';
    private apiUrl = environment.production ? 'https://gbraidfinderapi.ogres.cc' : 'http://gbraidfinderapi.ogres.cc'
    private stats_apiUrl = environment.production ? 'https://gbraidfinderstatsapi.ogres.cc' : 'https://gbraidfinderstatsapi.ogres.cc'
    // private apiURL = '';

    constructor(protected http: HttpClient) {
        this.init();
    }

    protected abstract init(): void;

    protected get(endpoint: string, options?: any): Observable<any> {
        return this.http.get(`${this.apiUrl}${endpoint}`, options);
    }

    protected post(endpoint: string, body?: any, options?: any): Observable<any> {
        return this.http.post(`${this.apiUrl}${endpoint}`, body || {}, options);
    }

    protected get_stats(endpoint: string, options?: any): Observable<any> {
        return this.http.get(`${this.stats_apiUrl}${endpoint}`, options);
    }

    protected post_stats(endpoint: string, body?: any, options?: any): Observable<any> {
        return this.http.post(`${this.stats_apiUrl}${endpoint}`, body || {}, options);
    }

}
