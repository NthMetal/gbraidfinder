import { Test, TestingModule } from '@nestjs/testing';
import { GbrService } from './gbr.service';

describe('GbrService', () => {
  let service: GbrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GbrService],
    }).compile();

    service = module.get<GbrService>(GbrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
