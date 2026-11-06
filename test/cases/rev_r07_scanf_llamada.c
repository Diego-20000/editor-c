#include <stdio.h>
int idx(int i){ return i * 2; }
int main(){
  int a[10] = {0}, i;
  for (i = 0; i < 3; i++) scanf("%d", &a[idx(i)]);
  printf("%d %d %d\n", a[0], a[2], a[4]);
  return 0;
}
