import { TestBed } from '@angular/core/testing';

import { ServiceCatalogService } from './service-catalog.service';

describe('ServiceCatalogService', () => {
  let service: ServiceCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceCatalogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
