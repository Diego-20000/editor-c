// espera: limpio
#include <stdio.h>
int main(){
  int n, i, x, menor, primero = 1;
  scanf("%d", &n);
  for (i = 0; i < n; i++) {
    scanf("%d", &x);
    if (primero) { menor = x; primero = 0; }
    else if (x < menor) menor = x;
  }
  if (!primero) printf("%d\n", menor);
  return 0;
}
