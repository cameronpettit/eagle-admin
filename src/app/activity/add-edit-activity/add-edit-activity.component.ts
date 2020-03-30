import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ProjectService } from 'app/services/project.service';
import { RecentActivityService } from 'app/services/recent-activity';
import { RecentActivity } from 'app/models/recentActivity';
import { Utils } from 'app/shared/utils/utils';
import { CommentPeriodService } from 'app/services/commentperiod.service';
@Component({
  selector: 'app-add-edit-activity',
  templateUrl: './add-edit-activity.component.html',
  styleUrls: ['./add-edit-activity.component.scss']
})
export class AddEditActivityComponent implements OnInit, OnDestroy {
  public myForm: FormGroup;
  public isEditing = false;
  private ngUnsubscribe: Subject<boolean> = new Subject<boolean>();
  public loading = true;
  public projects = [];
  public types = [];
  public periods = [];
  public activity: any;
  public typeIsPCP = false;
  public projectIsSelected = false;

  public tinyMceSettings = {
    skin: false,
    browser_spellcheck: true,
    height: 240
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private utils: Utils,
    private recentActivityService: RecentActivityService,
    private projectService: ProjectService,
    private commentPeriodService: CommentPeriodService,
    private _changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.route.data
      .takeUntil(this.ngUnsubscribe)
      .subscribe(res => {
        if (Object.keys(res).length === 0 && res.constructor === Object) {
          this.buildForm({
            'headline': '',
            'content': '',
            'dateAdded': new Date(),
            'project': '',
            'active': '',
            'pinned': false,
            'type': '',
            'pcp': '',
            'contentUrl': '',
            'documentUrl': ''
          });
        } else {
          this.isEditing = true;
          this.buildForm(res.activity.data);
          this.activity = res.activity.data;

          // init flags
          this.updateProject();
          this.updateType();
        }

        this.projectService.getAll(1, 1000, '+name')
          .takeUntil(this.ngUnsubscribe)
          .subscribe((res2: any) => {
            if (res2) {
              this.projects = res2.data;
              // TODO: Later
              // Types
              // this.types = this.configService.lists.filter(item => {
              //   return item.type === 'headlineType';
              // });
            }

            // if the pcp selector is populated, try to set the saved value.
            if (this.typeIsPCP) {
              this.myForm.controls['pcp'].setValue(this.activity.pcp);
            }

            this.loading = false;
            this._changeDetectorRef.detectChanges();
          });
      });
  }

  onCancel() {
    this.router.navigate(['/activity']);
  }

  onSubmit() {
    if (this.isEditing) {
      let activity = new RecentActivity({
        _id: this.activity._id,
        headline: this.myForm.controls.headline.value,
        content: this.myForm.controls.content.value,
        dateAdded: this.utils.convertFormGroupNGBDateToJSDate(this.myForm.get('dateAdded').value),
        project: this.myForm.get('project').value,
        type: this.myForm.get('type').value,
        pcp: this.myForm.get('pcp').value,

        // TODO: ETL this to merge.
        contentUrl: this.myForm.controls.contentUrl.value,
        documentUrl: this.myForm.controls.documentUrl.value,
        active: this.myForm.controls.active.value === 'yes' ? true : false,
        pinned: this.activity.pinned
      });
      console.log('saving:', activity);
      this.recentActivityService.save(activity)
        .subscribe(() => {
          // console.log('item', item);
          this.router.navigate(['/activity']);
        });
    } else {
      let activity = new RecentActivity({
        headline: this.myForm.controls.headline.value,
        content: this.myForm.controls.content.value,
        dateAdded: new Date(),
        project: this.myForm.get('project').value,
        type: this.myForm.get('type').value,
        pcp: this.myForm.get('pcp').value,
        contentUrl: this.myForm.controls.contentUrl.value,
        documentUrl: this.myForm.controls.documentUrl.value,
        pinned: false,
        active: this.myForm.controls.active.value === 'yes' ? true : false
      });
      console.log('adding:', activity);
      this.recentActivityService.add(activity)
        .subscribe(() => {
          // console.log('saved:', item);
          this.router.navigate(['/activity']);
        });
    }
  }

  public updateType() {
    if (this.myForm.get('type').value === 'Public Comment Period') {
      this.typeIsPCP = true;
      this.myForm.get('pcp').enable();
      if (this.projectIsSelected) {
        this.loadPcpsForProject(this.myForm.get('project').value);
      }
    } else {
      this.typeIsPCP = false;
      this.myForm.controls['pcp'].reset({ value: '', disabled: true });
    }
    this._changeDetectorRef.detectChanges();
  }

  public updateProject() {
    let currentProjectId = this.myForm.get('project').value;
    if (currentProjectId === undefined) {
      this.projectIsSelected = false;
    } else {
      this.projectIsSelected = true;
      if (this.typeIsPCP) {
        this.loadPcpsForProject(currentProjectId);
      }
    }
    this._changeDetectorRef.detectChanges();
  }

  public loadPcpsForProject(projectId) {
    this.commentPeriodService.getAllByProjectId(projectId)
      .takeUntil(this.ngUnsubscribe)
      .subscribe((res: any) => {
        if (res) {
          this.periods = res.data;
          this.myForm.controls['pcp'].setValue('');
          this._changeDetectorRef.detectChanges();
        }
      });
  }

  register(myForm: FormGroup) {
    console.log('Successful registration');
    console.log(myForm);
  }

  buildForm(data) {
    // console.log('data:', data);
    this.myForm = new FormGroup({
      'headline': new FormControl(data.headline),
      'content': new FormControl(data.content),
      'dateAdded': new FormControl(this.utils.convertJSDateToNGBDate(new Date(data.dateAdded))),
      'project': new FormControl(data.project),
      'active': new FormControl(data.active ? 'yes' : 'no'),
      'type': new FormControl(data.type),
      'pcp': new FormControl({ value: data.pcp, disabled: true }),
      'contentUrl': new FormControl(data.contentUrl),
      'documentUrl': new FormControl(data.documentUrl)
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
