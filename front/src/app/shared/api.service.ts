import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export abstract class ApiService {

    private apiUrl = 'http://a868a8c31504e4112a3411a9209b472c-896034623.us-east-2.elb.amazonaws.com';
    // private apiUrl = environment.production ? 'http://a890d0112283f441c97c59d563d05071-370247399.us-east-2.elb.amazonaws.com' : 'http://localhost:3000'
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
