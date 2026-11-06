#include <stdio.h>
int main(void){
  int m[3][3] = {0};
  int p[2][3] = {1, 2, 3, 4};
  printf("%d %d %d\n", m[2][2], p[0][2], p[1][0]);
  return 0;
}
