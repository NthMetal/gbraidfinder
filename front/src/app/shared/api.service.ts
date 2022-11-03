import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export abstract class ApiService {

    private apiUrl = 'http://ab03fa61e9ff54cdaa96a0411941227a-113682306.us-east-2.elb.amazonaws.com';
    // private apiUrl = environment.production ? 'http://a45046720dba34164b9cf84c303ad1b7-561645660.us-east-2.elb.amazonaws.com' : 'http://localhost:3000'
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

}
