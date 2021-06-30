import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriveSelectorComponent } from './driveselector.component';

describe('DriveSelectorComponent', () => {
  let component: DriveSelectorComponent;
  let fixture: ComponentFixture<DriveSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DriveSelectorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DriveSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
