import { Test, TestingModule } from '@nestjs/testing';
import { RaidService } from './raid.service';

describe('RaidService', () => {
  let service: RaidService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RaidService],
    }).compile();

    service = module.get<RaidService>(RaidService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
