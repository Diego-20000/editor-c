// espera: W-rama-inalcanzable
// kb: LOG-011
#include <stdio.h>
int main() {
  int NOTA;
  scanf("%d", &NOTA);
  if (NOTA >= 4) { printf("Regular\n"); }
  else if (NOTA >= 7) { printf("Bueno\n"); }
  else { printf("Insuficiente\n"); }
  return 0;
}
