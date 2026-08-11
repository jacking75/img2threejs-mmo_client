# img2threejs 런타임 어댑터 메모

## 목적과 경계

`docs_working/img2threejs/avatar-suite`의 명세와 리뷰 자료는 비율·실루엣·재질·소켓을
검토한 제작 증거다. 런타임 정본 상태가 아니며 브라우저 코드가 참조 이미지나 리뷰
JSON을 직접 import하지 않는다. 현재 blockout 보정 루프는 3/3에서 중단됐고 여성 전사
GLB의 마지막 수동 검수 점수는 0.69이므로, 이를 승인 기준 0.70을 통과한 최종 에셋으로
표현하지 않는다.

## 아바타 어댑터

- `createRuntimeAvatar`는 즉시 사용할 수 있는 절차형 `AvatarGroup`을 만들고 여성형 전사에
  한해 원본 Blender GLB를 비동기로 교체한다.
- 절차형/GLB 경로 모두 `root`, `head`, `hand.R`, `hand.L`, `back`과 이름 있는 사지 피벗을
  `avatar.userData.sculptRuntime`으로 노출한다.
- `AvatarRenderer`는 상태에 따라 피벗만 애니메이션하고, `EquipmentRenderer`만 직렬화된
  장비 ID를 시각 팩토리와 연결한다. GLB나 팩토리가 게임 상태·카메라·루프를 소유하지 않는다.
- GLB가 준비되면 소켓 부착물을 새 리그 소켓으로 옮긴다. 여성 전사의 비동기 외형 전환과
  여행자 의상/초보자 모자의 낮은 GLB 전용 품질은 알려진 한계다.

## 강체 장비 어댑터

- 검 팩토리 원점은 그립 중앙 `(0, 0, 0)`이고 칼끝은 로컬 `+Y`, 칼날 앞면은 로컬 `+Z`다.
- 절차형 손과 GLB 손의 휴지 회전 차이는 `EquipmentRenderer`의 소켓 정렬에서만 보정한다.
- 생성된 그룹은 전역 씬을 참조하지 않고 `userData.equipmentContract`에 축·원점·폐기 정책을
  기록한다. 교체/종료 시 하위 geometry와 material을 중복 없이 모두 dispose한다.
- 새 `img2threejs` 강체 장비는 명세·다각도 검토를 통과한 뒤 `EquipmentVisual.create()` 뒤에
  연결한다. 도메인 카탈로그에 ID를 추가하는 일과 시각 팩토리 편입은 별도 결정이다.

## Phase 8 적용 범위

이번 단계는 캐릭터 형상을 재보정하지 않는다. 기존 셀 셰이딩과 팔레트를 유지하면서
필드의 이동형 보조광, 톤 매핑 노출, 화면 가장자리 대비와 공격 검기만 조정한다. 지팡이,
활, 화살통과 필드 소품은 개발용 시각 리소스로 보존하며 검 전투 도메인에는 편입하지 않는다.
